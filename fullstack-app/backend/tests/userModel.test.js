const test = require('node:test');
const assert = require('node:assert/strict');
const { buildUserFindByIdQuery, isMissingColumnError } = require('../models/user');

test('buildUserFindByIdQuery omits the password-change column when requested', () => {
  const sql = buildUserFindByIdQuery(false);

  assert.match(sql, /SELECT id, name, email, username, role, is_verified, is_active/);
  assert.doesNotMatch(sql, /must_change_password/);
  assert.match(sql, /FROM Users WHERE id = @id/);
});

test('buildUserFindByIdQuery includes level_scope by default and omits when requested', () => {
  const withScope = buildUserFindByIdQuery(true, true);
  assert.match(withScope, /level_scope/);

  const withoutScope = buildUserFindByIdQuery(true, false);
  assert.doesNotMatch(withoutScope, /level_scope/);
});

test('isMissingColumnError detects SQL Server and PostgreSQL missing-column errors', () => {
  assert.equal(isMissingColumnError(new Error("Invalid column name 'must_change_password'"), 'must_change_password'), true);
  assert.equal(isMissingColumnError(new Error("column \"must_change_password\" does not exist"), 'must_change_password'), true);
  assert.equal(isMissingColumnError(new Error("Invalid column name 'level_scope'"), 'level_scope'), true);
  assert.equal(isMissingColumnError(new Error('some other database error'), 'must_change_password'), false);
});
