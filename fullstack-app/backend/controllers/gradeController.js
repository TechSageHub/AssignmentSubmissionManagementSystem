const submissionModel = require('../models/submission');
const gradeModel = require('../models/grade');
const rubricModel = require('../models/rubric');
const userModel = require('../models/user');
const { sendGradeReleased } = require('../utils/emailHelper');
const { notifyGradeReleased } = require('../utils/notificationHelper');
const auditLog = require('../utils/auditLogger');

async function gradeSubmission(req, res, next) {
  try {
    const submissionId = parseInt(req.params.submissionId, 10);
    if (isNaN(submissionId)) {
      return res.status(400).json({ error: 'ValidationError', details: 'Invalid submission ID' });
    }

    const submission = await submissionModel.findById(submissionId);
    if (!submission) {
      return res.status(404).json({ error: 'NotFoundError', details: 'Submission not found' });
    }

    const { score, feedback, criteriaScores } = req.body;

    if (score === undefined || score === null) {
      return res.status(400).json({ error: 'ValidationError', details: 'Score is required' });
    }
    const numericScore = Number(score);
    if (isNaN(numericScore) || numericScore < 0 || numericScore > 100) {
      return res.status(400).json({ error: 'ValidationError', details: 'Score must be a number between 0 and 100' });
    }

    const grade = await gradeModel.upsert({
      submissionId,
      score: numericScore,
      feedback: feedback || null,
    });

    // Save per-criterion scores if provided
    if (Array.isArray(criteriaScores) && criteriaScores.length > 0) {
      await rubricModel.saveGradeCriteria(grade.id, criteriaScores);
    }

    try {
      await notifyGradeReleased(submission.student_id, submission.assignment_title, submissionId);
      const student = await userModel.findByIdWithEmail(submission.student_id);
      if (student) {
        await sendGradeReleased(student.email, student.name, submission.assignment_title, numericScore, feedback || null);
      }
    } catch (emailErr) {
      console.error('Failed to send grade notification email:', emailErr.message);
    }

    auditLog.log(req, 'grade', 'submission', submissionId, { score: numericScore });

    const gradeWithCriteria = await gradeModel.findBySubmission(submissionId);
    gradeWithCriteria.criteria_scores = await rubricModel.findByGrade(grade.id);
    res.json(gradeWithCriteria);
  } catch (err) {
    next(err);
  }
}

async function bulkGradeSubmissions(req, res, next) {
  try {
    const { submissionIds, score, feedback } = req.body;
    if (!Array.isArray(submissionIds) || submissionIds.length === 0) {
      return res.status(400).json({ error: 'ValidationError', details: 'At least one submission is required' });
    }

    const numericScore = Number(score);
    if (isNaN(numericScore) || numericScore < 0 || numericScore > 100) {
      return res.status(400).json({ error: 'ValidationError', details: 'Score must be a number between 0 and 100' });
    }

    const results = [];
    for (const submissionId of submissionIds) {
      const parsedId = parseInt(submissionId, 10);
      if (isNaN(parsedId)) continue;
      const submission = await submissionModel.findById(parsedId);
      if (!submission) continue;
      const grade = await gradeModel.upsert({ submissionId: parsedId, score: numericScore, feedback: feedback || null });
      results.push({ submissionId: parsedId, gradeId: grade.id });
    }

    res.json({ message: 'Bulk grading completed', updated: results.length, results });
  } catch (err) {
    next(err);
  }
}

async function getGrade(req, res, next) {
  try {
    const submissionId = parseInt(req.params.submissionId, 10);
    if (isNaN(submissionId)) {
      return res.status(400).json({ error: 'ValidationError', details: 'Invalid submission ID' });
    }

    const submission = await submissionModel.findById(submissionId);
    if (!submission) {
      return res.status(404).json({ error: 'NotFoundError', details: 'Submission not found' });
    }

    if (req.user.role === 'student' && submission.student_id !== req.user.id) {
      return res.status(403).json({ error: 'AuthorizationError', details: 'Not your submission' });
    }

    const grade = await gradeModel.findBySubmission(submissionId);
    if (!grade) {
      return res.json({ submission_id: submissionId, score: null, feedback: null, status: 'pending' });
    }

    const criteriaScores = await rubricModel.findByGrade(grade.id);
    res.json({ ...grade, criteria_scores: criteriaScores });
  } catch (err) {
    next(err);
  }
}

module.exports = { gradeSubmission, bulkGradeSubmissions, getGrade };
