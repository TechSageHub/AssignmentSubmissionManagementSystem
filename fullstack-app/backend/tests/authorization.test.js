const test = require('node:test');
const assert = require('node:assert/strict');
const { canGradeSubmission } = require('../utils/authorization');

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