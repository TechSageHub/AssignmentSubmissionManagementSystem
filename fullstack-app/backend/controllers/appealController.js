const submissionModel = require('../models/submission');
const assignmentModel = require('../models/assignment');
const gradeModel = require('../models/grade');
const gradeAppealModel = require('../models/gradeAppeal');
const groupMemberModel = require('../models/groupMember');
const userModel = require('../models/user');
const auditLog = require('../utils/auditLogger');
const { notifyAppealFiled, notifyAppealResolved } = require('../utils/notificationHelper');
const { sendAppealFiled, sendAppealResolved } = require('../utils/emailHelper');
const { assertSubmissionReadAccess } = require('../utils/authorization');

const MAX_REASON_LENGTH = 2000;

async function fileAppeal(req, res, next) {
  try {
    const submissionId = parseInt(req.body.submissionId, 10);
    if (isNaN(submissionId)) {
      return res.status(400).json({ error: 'ValidationError', details: 'Invalid submission ID' });
    }

    const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';
    if (!reason) {
      return res.status(400).json({ error: 'ValidationError', details: 'Please explain why you are appealing this grade' });
    }
    if (reason.length > MAX_REASON_LENGTH) {
      return res.status(400).json({ error: 'ValidationError', details: `Appeal reason must be ${MAX_REASON_LENGTH} characters or fewer` });
    }

    const submission = await submissionModel.findById(submissionId);
    if (!submission) {
      return res.status(404).json({ error: 'NotFoundError', details: 'Submission not found' });
    }

    const isGroupMember = req.user.role === 'student'
      ? await groupMemberModel.isMember(submissionId, req.user.id)
      : false;
    const access = await assertSubmissionReadAccess(req.user, submission, isGroupMember);
    if (!access.ok) {
      return res.status(access.status).json({ error: 'AuthorizationError', details: access.message });
    }

    const [grade, existingAppeal] = await Promise.all([
      gradeModel.findBySubmission(submissionId),
      gradeAppealModel.findBySubmission(submissionId),
    ]);

    const eligibility = gradeAppealModel.resolveAppealEligibility({ grade, existingAppeal });
    if (!eligibility.ok) {
      return res.status(eligibility.status).json({ error: 'ConflictError', details: eligibility.details });
    }

    const appeal = await gradeAppealModel.create({ submissionId, studentId: req.user.id, reason });

    auditLog.log(req, 'appeal_file', 'submission', submissionId, { appealId: appeal.id, reason });

    const assignment = await assignmentModel.findById(submission.assignment_id);
    const lecturerEmail = assignment
      ? await userModel.findByIdWithEmail(assignment.lecturer_id)
      : null;

    if (assignment) {
      await notifyAppealFiled(assignment.lecturer_id, assignment.title, appeal.id);
    }
    if (lecturerEmail) {
      try {
        await sendAppealFiled(lecturerEmail.email, lecturerEmail.name, req.user.name, assignment.title, reason);
      } catch (emailErr) {
        console.error('Failed to send appeal-filed email:', emailErr.message);
      }
    }

    res.status(201).json(appeal);
  } catch (err) {
    next(err);
  }
}

async function getMyAppeals(req, res, next) {
  try {
    const appeals = await gradeAppealModel.findByStudent(req.user.id);
    res.json(appeals);
  } catch (err) {
    next(err);
  }
}

async function getLecturerAppeals(req, res, next) {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
    const result = await gradeAppealModel.findByLecturer(req.user.id, { status, limit, offset });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function rejectAppeal(req, res, next) {
  try {
    const appealId = parseInt(req.params.id, 10);
    if (isNaN(appealId)) {
      return res.status(400).json({ error: 'ValidationError', details: 'Invalid appeal ID' });
    }

    const status = typeof req.body.status === 'string' ? req.body.status.trim() : '';
    if (status !== 'rejected') {
      return res.status(400).json({ error: 'ValidationError', details: 'Use the grading page to accept an appeal and adjust the grade' });
    }
    const comment = typeof req.body.lecturerComment === 'string' ? req.body.lecturerComment.trim() : '';
    if (comment.length > 5000) {
      return res.status(400).json({ error: 'ValidationError', details: 'Comment must be 5000 characters or fewer' });
    }

    const appeal = await gradeAppealModel.findById(appealId);
    if (!appeal) {
      return res.status(404).json({ error: 'NotFoundError', details: 'Appeal not found' });
    }
    if (appeal.status !== 'open') {
      return res.status(409).json({ error: 'ConflictError', details: 'This appeal has already been resolved' });
    }

    const submission = await submissionModel.findById(appeal.submission_id);
    if (!submission) {
      return res.status(404).json({ error: 'NotFoundError', details: 'Submission not found' });
    }
    const assignment = await assignmentModel.findById(submission.assignment_id);
    if (!assignment || assignment.lecturer_id !== req.user.id) {
      return res.status(403).json({ error: 'AuthorizationError', details: 'Only the assignment lecturer can resolve this appeal' });
    }

    const resolved = await gradeAppealModel.reject(appealId, comment || null);
    if (!resolved) {
      return res.status(409).json({ error: 'ConflictError', details: 'This appeal has already been resolved' });
    }

    auditLog.log(req, 'appeal_reject', 'submission', appeal.submission_id, { appealId, comment });

    await notifyAppealResolved(appeal.student_id, assignment.title, 'rejected', appeal.submission_id);
    const student = await userModel.findByIdWithEmail(appeal.student_id);
    if (student) {
      try {
        await sendAppealResolved(student.email, student.name, assignment.title, 'rejected', comment || null);
      } catch (emailErr) {
        console.error('Failed to send appeal-resolved email:', emailErr.message);
      }
    }

    res.json({ message: 'Appeal rejected', id: appealId });
  } catch (err) {
    next(err);
  }
}

module.exports = { fileAppeal, getMyAppeals, getLecturerAppeals, rejectAppeal };