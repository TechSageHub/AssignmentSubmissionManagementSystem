const assignmentModel = require('../models/assignment');

// Pure decision helper (no DB) so it can be unit-tested directly.
// Returns { ok } or { ok: false, status, message }.
function canGradeSubmission({ lecturerId, submission, assignment }) {
  if (!submission || !submission.assignment_id) {
    return { ok: false, status: 404, message: 'Submission not found' };
  }

  if (!assignment) {
    return { ok: false, status: 404, message: 'Submission not found' };
  }

  if (assignment.lecturer_id !== lecturerId) {
    return { ok: false, status: 403, message: 'Not your assignment' };
  }

  return { ok: true };
}

// Verify that the given lecturer owns the assignment that a submission belongs to.
async function assertSubmissionAssignmentOwner(lecturerId, submission) {
  if (!submission || !submission.assignment_id) {
    return { ok: false, status: 404, message: 'Submission not found' };
  }

  const assignment = await assignmentModel.findById(submission.assignment_id);
  return canGradeSubmission({ lecturerId, submission, assignment });
}

module.exports = { canGradeSubmission, assertSubmissionAssignmentOwner };