const assignmentModel = require('../models/assignment');
const courseModel = require('../models/course');
const userModel = require('../models/user');
const { sendAssignmentCreated } = require('../utils/emailHelper');
const { notifyAssignmentCreated } = require('../utils/notificationHelper');
const { parseInputDate, toStoredUtc, toIsoUtc } = require('../utils/dates');
const { isTargetLevelAllowed } = require('../utils/academic');
const auditLog = require('../utils/auditLogger');

function withUtcDueDate(row) {
  if (row && row.due_date != null) {
    row.due_date = toIsoUtc(row.due_date);
  }
  if (row && row.late_cutoff != null) {
    row.late_cutoff = toIsoUtc(row.late_cutoff);
  }
  if (row && row.publish_date != null) {
    row.publish_date = toIsoUtc(row.publish_date);
  }
  return row;
}

function toBit(value) {
  return value === false || value === 'false' || value === 0 ? 0 : 1;
}

// When a course_id is supplied, backfill course_code/course_title from the
// catalog so legacy display columns stay in sync. Throws 400 if the course
// does not exist.
async function resolveCourseFields({ courseId, courseCode, courseTitle }) {
  if (courseId == null) {
    return { courseId: null, courseCode, courseTitle };
  }
  const course = await courseModel.findById(courseId);
  if (!course) {
    const err = new Error('Course not found');
    err.status = 400;
    throw err;
  }
  return {
    courseId: course.id,
    courseCode: course.code,
    courseTitle: course.title,
  };
}

async function createAssignment(req, res, next) {
  try {
    const { title, description, due_date, course_code, course_title, course_id, semester, target_level, accept_late_submissions, late_cutoff, publish_date } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'ValidationError', details: 'Title is required' });
    }
    if (title.length > 200) {
      return res.status(400).json({ error: 'ValidationError', details: 'Title must be 200 characters or less' });
    }
    if (!due_date) {
      return res.status(400).json({ error: 'ValidationError', details: 'Due date is required' });
    }

    if (target_level && req.user.level_scope && !isTargetLevelAllowed(req.user.level_scope, target_level)) {
      return res.status(400).json({
        error: 'ValidationError',
        details: `Your teaching scope does not permit assigning to ${target_level}.`
      });
    }

    // The client sends an ISO instant (with Z). Legacy naive "YYYY-MM-DDTHH:mm"
    // values are treated as UTC. Store a naive UTC wall-clock and require it to
    // be in the future.
    const dueDateTime = parseInputDate(due_date);
    if (!dueDateTime) {
      return res.status(400).json({ error: 'ValidationError', details: 'Due date must be a valid date and time' });
    }
    if (dueDateTime <= new Date()) {
      return res.status(400).json({ error: 'ValidationError', details: 'Due date must be in the future' });
    }

    const courseFields = await resolveCourseFields({ courseId: course_id, courseCode: course_code, courseTitle: course_title });

    let lateCutoff = null;
    if (late_cutoff) {
      const parsedCutoff = parseInputDate(late_cutoff);
      if (!parsedCutoff) {
        return res.status(400).json({ error: 'ValidationError', details: 'Late submission cutoff must be a valid date and time' });
      }
      if (parsedCutoff <= dueDateTime) {
        return res.status(400).json({ error: 'ValidationError', details: 'Late submission cutoff must be after the due date' });
      }
      lateCutoff = toStoredUtc(parsedCutoff);
    }

    let publishDate = null;
    if (publish_date) {
      const parsedPublish = parseInputDate(publish_date);
      if (!parsedPublish) {
        return res.status(400).json({ error: 'ValidationError', details: 'Publish date must be a valid date and time' });
      }
      publishDate = toStoredUtc(parsedPublish);
    }

    const assignment = await assignmentModel.create({
      lecturerId: req.user.id,
      title: title.trim(),
      description: description || null,
      dueDate: toStoredUtc(dueDateTime),
      ...courseFields,
      semester: semester || null,
      targetLevel: target_level || null,
      acceptLateSubmissions: toBit(accept_late_submissions),
      lateCutoff,
      publishDate,
    });

    // Notify students matching lecturer's department and target level, but only
    // when the assignment is visible to them right away.
    if (!publishDate || parseInputDate(publishDate) <= new Date()) {
      try {
        const students = await userModel.findStudentsForAssignment({
          department: req.user.department,
          targetLevel: target_level || null,
        });
        const lecturerName = req.user.name;
        const studentIds = students.map(s => s.id);
        await notifyAssignmentCreated(studentIds, title, assignment.id);
        for (const student of students) {
          await sendAssignmentCreated(student.email, student.name, title, dueDateTime, lecturerName);
        }
      } catch (emailErr) {
        console.error('Failed to send assignment notification emails:', emailErr.message);
      }
    }

    auditLog.log(req, 'create', 'assignment', assignment.id, { title });

    res.status(201).json(withUtcDueDate(assignment));
  } catch (err) {
    next(err);
  }
}

async function getAssignments(req, res, next) {
  try {
    const assignments = await assignmentModel.findAll(req.user.id, req.user.role, req.user);
    res.json(assignments.map(withUtcDueDate));
  } catch (err) {
    next(err);
  }
}

async function getAssignment(req, res, next) {
  try {
    const assignmentId = parseInt(req.params.id, 10);
    if (isNaN(assignmentId)) {
      return res.status(400).json({ error: 'ValidationError', details: 'Invalid assignment ID' });
    }
    const assignment = await assignmentModel.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ error: 'NotFoundError', details: 'Assignment not found' });
    }
    // Students must not see assignments whose scheduled publish date has not
    // arrived yet.
    if (req.user.role === 'student' && assignment.publish_date != null && parseInputDate(assignment.publish_date) > new Date()) {
      return res.status(404).json({ error: 'NotFoundError', details: 'Assignment not found' });
    }
    res.json(withUtcDueDate(assignment));
  } catch (err) {
    next(err);
  }
}

async function updateAssignment(req, res, next) {
  try {
    const assignmentId = parseInt(req.params.id, 10);
    if (isNaN(assignmentId)) {
      return res.status(400).json({ error: 'ValidationError', details: 'Invalid assignment ID' });
    }
    const assignment = await assignmentModel.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ error: 'NotFoundError', details: 'Assignment not found' });
    }
    if (assignment.lecturer_id !== req.user.id) {
      return res.status(403).json({ error: 'AuthorizationError', details: 'Not your assignment' });
    }

    const { title, description, due_date, course_code, course_title, course_id, semester, target_level, accept_late_submissions, late_cutoff, publish_date } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'ValidationError', details: 'Title is required' });
    }

    if (target_level && req.user.level_scope && !isTargetLevelAllowed(req.user.level_scope, target_level)) {
      return res.status(400).json({
        error: 'ValidationError',
        details: `Your teaching scope does not permit assigning to ${target_level}.`
      });
    }

    // Keep stored value unless a new date is supplied. When supplied, parse the
    // ISO/naive value as UTC and require it to be in the future.
    let dueDate = assignment.due_date;
    if (due_date) {
      const parsed = parseInputDate(due_date);
      if (!parsed) {
        return res.status(400).json({ error: 'ValidationError', details: 'Due date must be a valid date and time' });
      }
      if (parsed <= new Date()) {
        return res.status(400).json({ error: 'ValidationError', details: 'Due date must be in the future' });
      }
      dueDate = toStoredUtc(parsed);
    } else {
      dueDate = toStoredUtc(assignment.due_date);
    }

    // Keep existing late policy unless a new value is supplied. An empty string
    // clears the cutoff; an explicit value must land after the due date.
    let acceptLate = toBit(assignment.accept_late_submissions);
    if (accept_late_submissions !== undefined) {
      acceptLate = toBit(accept_late_submissions);
    }

    let lateCutoff = assignment.late_cutoff != null ? toStoredUtc(assignment.late_cutoff) : null;
    if (late_cutoff !== undefined) {
      if (late_cutoff === null || late_cutoff === '') {
        lateCutoff = null;
      } else {
        const parsedCutoff = parseInputDate(late_cutoff);
        if (!parsedCutoff) {
          return res.status(400).json({ error: 'ValidationError', details: 'Late submission cutoff must be a valid date and time' });
        }
        if (parsedCutoff <= parseInputDate(dueDate)) {
          return res.status(400).json({ error: 'ValidationError', details: 'Late submission cutoff must be after the due date' });
        }
        lateCutoff = toStoredUtc(parsedCutoff);
      }
    }

    // Keep existing publish date unless a new value is supplied. An empty
    // string publishes immediately (clears the schedule).
    let publishDate = assignment.publish_date != null ? toStoredUtc(assignment.publish_date) : null;
    if (publish_date !== undefined) {
      if (publish_date === null || publish_date === '') {
        publishDate = null;
      } else {
        const parsedPublish = parseInputDate(publish_date);
        if (!parsedPublish) {
          return res.status(400).json({ error: 'ValidationError', details: 'Publish date must be a valid date and time' });
        }
        publishDate = toStoredUtc(parsedPublish);
      }
    }

    const courseFields = await resolveCourseFields({
      courseId: course_id !== undefined ? course_id : assignment.course_id,
      courseCode: course_code !== undefined ? course_code : assignment.course_code,
      courseTitle: course_title !== undefined ? course_title : assignment.course_title,
    });

    const updated = await assignmentModel.update(assignmentId, {
      title: title.trim(),
      description: description || null,
      dueDate,
      ...courseFields,
      semester: semester !== undefined ? semester : assignment.semester,
      targetLevel: target_level !== undefined ? target_level : assignment.target_level,
      acceptLateSubmissions: acceptLate,
      lateCutoff,
      publishDate,
    });

    res.json(withUtcDueDate(updated));
  } catch (err) {
    next(err);
  }
}

async function deleteAssignment(req, res, next) {
  try {
    const assignmentId = parseInt(req.params.id, 10);
    if (isNaN(assignmentId)) {
      return res.status(400).json({ error: 'ValidationError', details: 'Invalid assignment ID' });
    }
    const assignment = await assignmentModel.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ error: 'NotFoundError', details: 'Assignment not found' });
    }
    if (assignment.lecturer_id !== req.user.id) {
      return res.status(403).json({ error: 'AuthorizationError', details: 'Not your assignment' });
    }

    await assignmentModel.remove(assignmentId);
    auditLog.log(req, 'delete', 'assignment', assignmentId, { title: assignment.title });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { createAssignment, getAssignments, getAssignment, updateAssignment, deleteAssignment };
