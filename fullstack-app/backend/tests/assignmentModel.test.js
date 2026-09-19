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

test('buildAssignmentCreateQuery includes late-policy columns by default and omits when requested', () => {
  const withPolicy = buildAssignmentCreateQuery(true, true, true, true);
  assert.match(withPolicy, /accept_late_submissions/);
  assert.match(withPolicy, /late_cutoff/);

  const withoutPolicy = buildAssignmentCreateQuery(true, true, true, false);
  assert.doesNotMatch(withoutPolicy, /accept_late_submissions|late_cutoff/);
});

test('buildAssignmentUpdateQuery includes late-policy columns by default and omits when requested', () => {
  const withPolicy = buildAssignmentUpdateQuery(true, true, true, true);
  assert.match(withPolicy, /accept_late_submissions = @acceptLateSubmissions/);
  assert.match(withPolicy, /late_cutoff = @lateCutoff/);

  const withoutPolicy = buildAssignmentUpdateQuery(true, true, true, false);
  assert.doesNotMatch(withoutPolicy, /accept_late_submissions|late_cutoff/);
});

test('buildAssignmentCreateQuery includes publish_date by default and omits when requested', () => {
  const withPublish = buildAssignmentCreateQuery(true, true, true, true, true);
  assert.match(withPublish, /publish_date/);

  const withoutPublish = buildAssignmentCreateQuery(true, true, true, true, false);
  assert.doesNotMatch(withoutPublish, /publish_date/);
});

test('buildAssignmentUpdateQuery includes publish_date by default and omits when requested', () => {
  const withPublish = buildAssignmentUpdateQuery(true, true, true, true, true);
  assert.match(withPublish, /publish_date = @publishDate/);

  const withoutPublish = buildAssignmentUpdateQuery(true, true, true, true, false);
  assert.doesNotMatch(withoutPublish, /publish_date/);
});
