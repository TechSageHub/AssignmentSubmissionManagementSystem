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

// Pure decision helper for viewing a submission / grade. Admin is a superuser;
// students may see their own or their group's submission; lecturers only
// submissions against their own assignments. Any other role is rejected —
// the previous if/else-if chains let unknown roles (and admins) fall through.
function resolveSubmissionReadAccess({ userId, role, submission, isGroupMember = false, assignmentLecturerId }) {
  if (!submission) {
    return { ok: false, status: 404, message: 'Submission not found' };
  }

  if (role === 'admin') {
    return { ok: true };
  }

  if (role === 'student') {
    if (submission.student_id === userId || isGroupMember) {
      return { ok: true };
    }
    return { ok: false, status: 403, message: 'Not your submission' };
  }

  if (role === 'lecturer') {
    if (assignmentLecturerId === undefined) {
      return { ok: false, status: 404, message: 'Assignment not found' };
    }
    if (assignmentLecturerId !== userId) {
      return { ok: false, status: 403, message: 'Not your assignment' };
    }
    return { ok: true };
  }

  return { ok: false, status: 403, message: 'Insufficient permissions' };
}

// Async wrapper that loads the assignment for lecturer checks and lets student
// callers pass their precomputed isGroupMember flag.
async function assertSubmissionReadAccess(user, submission, isGroupMember = false) {
  if (!submission) {
    return { ok: false, status: 404, message: 'Submission not found' };
  }

  if (user.role === 'lecturer') {
    const assignment = submission.assignment_id
      ? await assignmentModel.findById(submission.assignment_id)
      : null;
    return resolveSubmissionReadAccess({
      userId: user.id,
      role: user.role,
      submission,
      assignmentLecturerId: assignment ? assignment.lecturer_id : undefined,
    });
  }

  return resolveSubmissionReadAccess({ userId: user.id, role: user.role, submission, isGroupMember });
}

module.exports = { canGradeSubmission, assertSubmissionAssignmentOwner, resolveSubmissionReadAccess, assertSubmissionReadAccess };