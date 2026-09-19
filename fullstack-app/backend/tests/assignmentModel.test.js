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

test('buildAssignmentCreateQuery includes target_level by default and omits when requested', () => {
  const withLevel = buildAssignmentCreateQuery(true, true);
  assert.match(withLevel, /target_level/);

  const withoutLevel = buildAssignmentCreateQuery(true, false);
  assert.doesNotMatch(withoutLevel, /target_level/);
});

test('buildAssignmentUpdateQuery includes target_level by default and omits when requested', () => {
  const withLevel = buildAssignmentUpdateQuery(true, true);
  assert.match(withLevel, /target_level = @targetLevel/);

  const withoutLevel = buildAssignmentUpdateQuery(true, false);
  assert.doesNotMatch(withoutLevel, /target_level/);
});

test('isMissingColumnError detects missing-column errors', () => {
  assert.equal(isMissingColumnError(new Error("Invalid column name 'course_code'"), 'course_code'), true);
  assert.equal(isMissingColumnError(new Error('column "course_title" does not exist'), 'course_title'), true);
  assert.equal(isMissingColumnError(new Error("Invalid column name 'target_level'"), 'target_level'), true);
  assert.equal(isMissingColumnError(new Error('some other database error'), 'course_code'), false);
});

test('buildAssignmentCreateQuery includes course_id and semester by default and omits when requested', () => {
  const withLink = buildAssignmentCreateQuery(true, true, true);
  assert.match(withLink, /course_id/);
  assert.match(withLink, /semester/);

  const withoutLink = buildAssignmentCreateQuery(true, true, false);
  assert.doesNotMatch(withoutLink, /course_id|semester/);
});

test('buildAssignmentUpdateQuery includes course_id and semester by default and omits when requested', () => {
  const withLink = buildAssignmentUpdateQuery(true, true, true);
  assert.match(withLink, /course_id = @courseId/);
  assert.match(withLink, /semester = @semester/);

  const withoutLink = buildAssignmentUpdateQuery(true, true, false);
  assert.doesNotMatch(withoutLink, /course_id|semester/);
});
