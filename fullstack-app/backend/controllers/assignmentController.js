const assignmentModel = require('../models/assignment');
const userModel = require('../models/user');
const { sendAssignmentCreated } = require('../utils/emailHelper');
const { notifyAssignmentCreated } = require('../utils/notificationHelper');
const auditLog = require('../utils/auditLogger');

async function createAssignment(req, res, next) {
  try {
    const { title, description, due_date, course_code, course_title } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'ValidationError', details: 'Title is required' });
    }
    if (title.length > 200) {
      return res.status(400).json({ error: 'ValidationError', details: 'Title must be 200 characters or less' });
    }
    if (!due_date) {
      return res.status(400).json({ error: 'ValidationError', details: 'Due date is required' });
    }
    if (new Date(due_date) <= new Date()) {
      return res.status(400).json({ error: 'ValidationError', details: 'Due date must be in the future' });
    }

    const assignment = await assignmentModel.create({
      lecturerId: req.user.id,
      title: title.trim(),
      description: description || null,
      dueDate: new Date(due_date),
      courseCode: course_code || null,
      courseTitle: course_title || null,
    });

    // Notify all students
    try {
      const students = await userModel.findAllStudents();
      const lecturerName = req.user.name;
      const studentIds = students.map(s => s.id);
      await notifyAssignmentCreated(studentIds, title, assignment.id);
      for (const student of students) {
        await sendAssignmentCreated(student.email, student.name, title, due_date, lecturerName);
      }
    } catch (emailErr) {
      console.error('Failed to send assignment notification emails:', emailErr.message);
    }

    auditLog.log(req, 'create', 'assignment', assignment.id, { title });

    res.status(201).json(assignment);
  } catch (err) {
    next(err);
  }
}

async function getAssignments(req, res, next) {
  try {
    const assignments = await assignmentModel.findAll(req.user.id, req.user.role);
    res.json(assignments);
  } catch (err) {
    next(err);
  }
}

async function getAssignment(req, res, next) {
  try {
    const assignment = await assignmentModel.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ error: 'NotFoundError', details: 'Assignment not found' });
    }
    res.json(assignment);
  } catch (err) {
    next(err);
  }
}

async function updateAssignment(req, res, next) {
  try {
    const assignment = await assignmentModel.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ error: 'NotFoundError', details: 'Assignment not found' });
    }
    if (assignment.lecturer_id !== req.user.id) {
      return res.status(403).json({ error: 'AuthorizationError', details: 'Not your assignment' });
    }

    const { title, description, due_date, course_code, course_title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'ValidationError', details: 'Title is required' });
    }

    const updated = await assignmentModel.update(req.params.id, {
      title: title.trim(),
      description: description || null,
      dueDate: due_date ? new Date(due_date) : assignment.due_date,
      courseCode: course_code !== undefined ? course_code : assignment.course_code,
      courseTitle: course_title !== undefined ? course_title : assignment.course_title,
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function deleteAssignment(req, res, next) {
  try {
    const assignment = await assignmentModel.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ error: 'NotFoundError', details: 'Assignment not found' });
    }
    if (assignment.lecturer_id !== req.user.id) {
      return res.status(403).json({ error: 'AuthorizationError', details: 'Not your assignment' });
    }

    await assignmentModel.remove(req.params.id);
    auditLog.log(req, 'delete', 'assignment', Number(req.params.id), { title: assignment.title });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { createAssignment, getAssignments, getAssignment, updateAssignment, deleteAssignment };
