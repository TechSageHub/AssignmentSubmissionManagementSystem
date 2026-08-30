const test = require('node:test');
const assert = require('node:assert/strict');
const { canGradeSubmission, resolveSubmissionReadAccess } = require('../utils/authorization');

test('canGradeSubmission allows the lecturer who owns the assignment', () => {
  const result = canGradeSubmission({
    lecturerId: 1,
    submission: { id: 10, assignment_id: 100, student_id: 2 },
    assignment: { id: 100, lecturer_id: 1 },
  });

  assert.equal(result.ok, true);
});

test('canGradeSubmission rejects a lecturer who does not own the assignment', () => {
  const result = canGradeSubmission({
    lecturerId: 5,
    submission: { id: 10, assignment_id: 100, student_id: 2 },
    assignment: { id: 100, lecturer_id: 1 },
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 403);
  assert.equal(result.message, 'Not your assignment');
});

test('canGradeSubmission rejects when the submission is missing', () => {
  const result = canGradeSubmission({ lecturerId: 1, submission: null, assignment: null });

  assert.equal(result.ok, false);
  assert.equal(result.status, 404);
});

test('canGradeSubmission rejects when the submission has no assignment', () => {
  const result = canGradeSubmission({
    lecturerId: 1,
    submission: { id: 10, student_id: 2 },
    assignment: null,
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 404);
});

test('canGradeSubmission rejects when the assignment no longer exists', () => {
  const result = canGradeSubmission({
    lecturerId: 1,
    submission: { id: 10, assignment_id: 100, student_id: 2 },
    assignment: null,
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 404);
});

test('resolveSubmissionReadAccess allows an admin on any submission', () => {
  const result = resolveSubmissionReadAccess({
    userId: 9,
    role: 'admin',
    submission: { id: 10, student_id: 2, assignment_id: 100 },
  });

  assert.equal(result.ok, true);
});

test('resolveSubmissionReadAccess lets students see their own submission', () => {
  const result = resolveSubmissionReadAccess({
    userId: 2,
    role: 'student',
    submission: { id: 10, student_id: 2, assignment_id: 100 },
  });

  assert.equal(result.ok, true);
});

test('resolveSubmissionReadAccess lets students see a group submission', () => {
  const result = resolveSubmissionReadAccess({
    userId: 3,
    role: 'student',
    submission: { id: 10, student_id: 2, assignment_id: 100 },
    isGroupMember: true,
  });

  assert.equal(result.ok, true);
});

test('resolveSubmissionReadAccess rejects unrelated students', () => {
  const result = resolveSubmissionReadAccess({
    userId: 4,
    role: 'student',
    submission: { id: 10, student_id: 2, assignment_id: 100 },
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 403);
  assert.equal(result.message, 'Not your submission');
});

test('resolveSubmissionReadAccess allows the owning lecturer', () => {
  const result = resolveSubmissionReadAccess({
    userId: 1,
    role: 'lecturer',
    submission: { id: 10, student_id: 2, assignment_id: 100 },
    assignmentLecturerId: 1,
  });

  assert.equal(result.ok, true);
});

test('resolveSubmissionReadAccess rejects a non-owning lecturer', () => {
  const result = resolveSubmissionReadAccess({
    userId: 1,
    role: 'lecturer',
    submission: { id: 10, student_id: 2, assignment_id: 100 },
    assignmentLecturerId: 7,
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 403);
  assert.equal(result.message, 'Not your assignment');
});

test('resolveSubmissionReadAccess rejects when the assignment is missing', () => {
  const result = resolveSubmissionReadAccess({
    userId: 1,
    role: 'lecturer',
    submission: { id: 10, student_id: 2, assignment_id: 100 },
    assignmentLecturerId: undefined,
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 404);
});

test('resolveSubmissionReadAccess rejects unknown roles instead of falling through', () => {
  const result = resolveSubmissionReadAccess({
    userId: 5,
    role: 'superuser',
    submission: { id: 10, student_id: 2, assignment_id: 100 },
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 403);
  assert.equal(result.message, 'Insufficient permissions');
});