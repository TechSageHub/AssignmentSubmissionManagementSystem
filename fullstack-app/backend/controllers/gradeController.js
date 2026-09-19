const submissionModel = require('../models/submission');
const gradeModel = require('../models/grade');
const rubricModel = require('../models/rubric');
const groupMemberModel = require('../models/groupMember');
const userModel = require('../models/user');
const { sendGradeReleased } = require('../utils/emailHelper');
const { notifyGradeReleased } = require('../utils/notificationHelper');
const auditLog = require('../utils/auditLogger');
const { assertSubmissionAssignmentOwner, assertSubmissionReadAccess } = require('../utils/authorization');
const { parseInputDate, toStoredUtc } = require('../utils/dates');

// Resolve grade release timing. 'now' (default) releases immediately, 'schedule'
// defers to a chosen instant, 'hold' keeps the grade hidden from students.
function resolveReleaseTime(mode, releaseAt) {
  if (mode === 'hold') return null;
  if (mode === 'schedule') {
    const when = parseInputDate(releaseAt);
    return toStoredUtc(when);
  }
  return toStoredUtc(new Date());
}

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

    const ownership = await assertSubmissionAssignmentOwner(req.user.id, submission);
    if (!ownership.ok) {
      return res.status(ownership.status).json({ error: 'AuthorizationError', details: ownership.message });
    }

    const { score, feedback, criteriaScores } = req.body;

    if (score === undefined || score === null || score === '') {
      return res.status(400).json({ error: 'ValidationError', details: 'Score is required' });
    }
    const numericScore = Number(score);
    if (isNaN(numericScore) || numericScore < 0 || numericScore > 100) {
      return res.status(400).json({ error: 'ValidationError', details: 'Score must be a number between 0 and 100' });
    }

    const releaseMode = req.body.release_mode || 'now';
    if (!['now', 'schedule', 'hold'].includes(releaseMode)) {
      return res.status(400).json({ error: 'ValidationError', details: 'release_mode must be "now", "schedule", or "hold"' });
    }
    if (releaseMode === 'schedule' && !parseInputDate(req.body.release_at)) {
      return res.status(400).json({ error: 'ValidationError', details: 'release_at is required when scheduling grade release' });
    }
    const releasedAt = resolveReleaseTime(releaseMode, req.body.release_at);

    // Validate per-criterion scores against the assignment's rubric so grades
    // can't reference foreign criteria or exceed each criterion's maximum.
    // When criteria scores are supplied the overall score is derived from
    // them as a weighted total (score/max × weight), so mismatched posted
    // totals can't corrupt the grade record.
    let validatedCriteria = [];
    let weightedScore = null;
    if (Array.isArray(criteriaScores) && criteriaScores.length > 0) {
      const rubric = await rubricModel.findByAssignment(submission.assignment_id);
      const allowed = new Map(rubric.map(c => [c.id, { max: Number(c.max_score), weight: c.weight == null ? null : Number(c.weight) }]));
      let total = 0;
      for (const cs of criteriaScores) {
        const criteriaId = Number(cs.criteriaId);
        const criterionScore = Number(cs.score);
        const meta = allowed.get(criteriaId);
        if (!meta) {
          return res.status(400).json({ error: 'ValidationError', details: `Unknown rubric criteria: ${cs.criteriaId}` });
        }
        if (!Number.isFinite(criterionScore) || criterionScore < 0 || criterionScore > meta.max) {
          return res.status(400).json({ error: 'ValidationError', details: `Score for "${cs.criteriaId}" must be between 0 and ${meta.max}` });
        }
        validatedCriteria.push({ criteriaId, score: criterionScore });
        total += (criterionScore / meta.max) * (meta.weight ?? 100);
      }
      weightedScore = Math.round(total * 100) / 100;
    }

    const grade = await gradeModel.upsert({
      submissionId,
      score: weightedScore ?? numericScore,
      feedback: feedback || null,
      releasedAt,
    });
    const finalScore = weightedScore ?? numericScore;

    // Save per-criterion scores if provided
    if (validatedCriteria.length > 0) {
      await rubricModel.saveGradeCriteria(grade.id, validatedCriteria);
    }

    const releasedNow = releasedAt != null && parseInputDate(releasedAt) <= new Date();
    if (releasedNow) {
      try {
        const memberRows = await groupMemberModel.findBySubmission(submissionId);
        const recipientIds = [submission.student_id, ...memberRows.map(m => m.user_id)];
        await notifyGradeReleased(recipientIds, submission.assignment_title, submissionId);
        const student = await userModel.findByIdWithEmail(submission.student_id);
        if (student) {
          await sendGradeReleased(student.email, student.name, submission.assignment_title, finalScore, feedback || null);
        }
      } catch (emailErr) {
        console.error('Failed to send grade notification email:', emailErr.message);
      }
    }

    auditLog.log(req, 'grade', 'submission', submissionId, { score: finalScore });

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

    if (score === undefined || score === null || score === '') {
      return res.status(400).json({ error: 'ValidationError', details: 'Score is required' });
    }

    const numericScore = Number(score);
    if (isNaN(numericScore) || numericScore < 0 || numericScore > 100) {
      return res.status(400).json({ error: 'ValidationError', details: 'Score must be a number between 0 and 100' });
    }

    const releaseMode = (req.body.release_mode || 'now').toString();
    if (!['now', 'schedule', 'hold'].includes(releaseMode)) {
      return res.status(400).json({ error: 'ValidationError', details: 'release_mode must be "now", "schedule", or "hold"' });
    }
    if (releaseMode === 'schedule' && !parseInputDate(req.body.release_at)) {
      return res.status(400).json({ error: 'ValidationError', details: 'release_at is required when scheduling grade release' });
    }
    const releasedAt = resolveReleaseTime(releaseMode, req.body.release_at);

    const results = [];
    const denied = [];
    for (const submissionId of submissionIds) {
      const parsedId = parseInt(submissionId, 10);
      if (isNaN(parsedId)) {
        denied.push({ submissionId, reason: 'Invalid submission ID' });
        continue;
      }
      const submission = await submissionModel.findById(parsedId);
      if (!submission) {
        denied.push({ submissionId: parsedId, reason: 'Submission not found' });
        continue;
      }
      const ownership = await assertSubmissionAssignmentOwner(req.user.id, submission);
      if (!ownership.ok) {
        denied.push({ submissionId: parsedId, reason: ownership.message });
        continue;
      }
      const grade = await gradeModel.upsert({ submissionId: parsedId, score: numericScore, feedback: feedback || null, releasedAt });
      results.push({ submissionId: parsedId, gradeId: grade.id });
    }

    if (results.length > 0) {
      auditLog.log(req, 'bulk_grade', 'submission', null, { count: results.length, score: numericScore });
    }

    res.json({ message: 'Bulk grading completed', updated: results.length, skipped: denied.length, denied });
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

    const isGroupMember = req.user.role === 'student'
      ? await groupMemberModel.isMember(submissionId, req.user.id)
      : false;
    const access = await assertSubmissionReadAccess(req.user, submission, isGroupMember);
    if (!access.ok) {
      return res.status(access.status).json({ error: 'AuthorizationError', details: access.message });
    }

    const grade = await gradeModel.findBySubmission(submissionId);
    if (!grade) {
      return res.json({ submission_id: submissionId, score: null, feedback: null, status: 'pending' });
    }

    const criteriaScores = await rubricModel.findByGrade(grade.id);

    const releasedAt = grade.released_at != null ? parseInputDate(grade.released_at) : null;
    const isReleased = releasedAt != null && releasedAt <= new Date();
    if (req.user.role === 'student' && !isReleased) {
      return res.json({
        ...grade,
        released: false,
        score: null,
        feedback: null,
        released_at: null,
        criteria_scores: [],
        status: 'withheld',
      });
    }

    res.json({ ...grade, released: isReleased, criteria_scores: criteriaScores });
  } catch (err) {
    next(err);
  }
}

module.exports = { gradeSubmission, bulkGradeSubmissions, getGrade };
