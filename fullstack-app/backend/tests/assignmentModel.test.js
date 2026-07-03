const test = require('node:test');
const assert = require('node:assert/strict');
const { buildAssignmentCreateQuery, buildAssignmentUpdateQuery, isMissingColumnError } = require('../models/assignment');

test('buildAssignmentCreateQuery omits course columns when requested', () => {
  const sql = buildAssignmentCreateQuery(false);

  assert.match(sql, /INSERT INTO Assignments/);
  assert.doesNotMatch(sql, /course_code|course_title/);
});

test('buildAssignmentUpdateQuery omits course columns when requested', () => {
  const sql = buildAssignmentUpdateQuery(false);

  assert.match(sql, /UPDATE Assignments/);
  assert.doesNotMatch(sql, /course_code|course_title/);
});

test('isMissingColumnError detects missing-column errors', () => {
  assert.equal(isMissingColumnError(new Error("Invalid column name 'course_code'"), 'course_code'), true);
  assert.equal(isMissingColumnError(new Error('column "course_title" does not exist'), 'course_title'), true);
  assert.equal(isMissingColumnError(new Error('some other database error'), 'course_code'), false);
});
