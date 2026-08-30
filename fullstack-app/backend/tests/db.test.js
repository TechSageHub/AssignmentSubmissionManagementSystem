const test = require('node:test');
const assert = require('node:assert/strict');
const { convertPgSql, isConnectionError, isDuplicateKeyError } = require('../config/db');

test('convertPgSql numbers params sequentially and builds values in order', () => {
  const { text, values } = convertPgSql(
    'SELECT * FROM Users WHERE email = @email AND role = @role',
    { role: 'student', email: 'a@b.c' }
  );
  assert.equal(text, 'SELECT * FROM Users WHERE email = $1 AND role = $2');
  assert.deepEqual(values, ['a@b.c', 'student']);
});

test('convertPgSql reuses repeated params instead of double-numbering', () => {
  const { text, values } = convertPgSql('UPDATE T SET a = @x WHERE b = @x', { x: 5 });
  assert.equal(text, 'UPDATE T SET a = $1 WHERE b = $1');
  assert.deepEqual(values, [5]);
});

test('convertPgSql translates OFFSET/FETCH to LIMIT/OFFSET', () => {
  const { text, values } = convertPgSql(
    'SELECT id FROM Users ORDER BY created_at DESC, id DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY',
    { offset: 0, limit: 20 }
  );
  assert.equal(text, 'SELECT id FROM Users ORDER BY created_at DESC, id DESC LIMIT $2 OFFSET $1');
  assert.deepEqual(values, [0, 20]);
});

test('convertPgSql keeps literal OFFSET/FETCH numbers intact', () => {
  const { text } = convertPgSql(
    'SELECT id FROM Users ORDER BY id OFFSET 10 ROWS FETCH NEXT @limit ROWS ONLY',
    { limit: 20 }
  );
  assert.equal(text, 'SELECT id FROM Users ORDER BY id LIMIT $1 OFFSET 10');
});

test('convertPgSql rewrites OUTPUT INSERTED to RETURNING', () => {
  const { text, values } = convertPgSql(
    'INSERT INTO Users (name, email)\n     OUTPUT INSERTED.id, INSERTED.name\n     VALUES (@name, @email)',
    { name: 'A', email: 'a@b.c' }
  );
  assert.equal(text, 'INSERT INTO Users (name, email) VALUES ($1, $2) RETURNING id, name');
  assert.deepEqual(values, ['A', 'a@b.c']);
});

test('convertPgSql rewrites UPDATE OUTPUT INSERTED to RETURNING', () => {
  const { text, values } = convertPgSql(
    'UPDATE Assignments\n     SET title = @title\n     OUTPUT INSERTED.*\n     WHERE id = @id',
    { title: 'X', id: 1 }
  );
  assert.equal(text, 'UPDATE Assignments\n     SET title = $1 WHERE id = $2 RETURNING *');
  assert.deepEqual(values, ['X', 1]);
});

test('convertPgSql rewrites DELETE OUTPUT DELETED to RETURNING', () => {
  const { text } = convertPgSql(
    'DELETE FROM Grades OUTPUT DELETED.id WHERE id = @id',
    { id: 7 }
  );
  assert.equal(text, 'DELETE FROM Grades WHERE id = $1 RETURNING id');
});

test('convertPgSql rewrites GETDATE, bit assignment and bracketed idents', () => {
  const { text } = convertPgSql(
    'UPDATE Users SET is_verified = 1, last_login = GETDATE() WHERE id = @id',
    { id: 1 }
  );
  assert.equal(text, 'UPDATE Users SET is_verified = true, last_login = NOW() WHERE id = $1');
  const ident = convertPgSql('SELECT [id], [name] FROM [Users]', {});
  assert.equal(ident.text, 'SELECT "id", "name" FROM "Users"');
  const blobQuery = convertPgSql('SELECT [key], [data] FROM [StorageBlobs] WHERE [key] = @key', { key: 'test/file.pdf' });
  assert.equal(blobQuery.text, 'SELECT "key", "data" FROM "StorageBlobs" WHERE "key" = $1');
});

test('isConnectionError matches transport failures only', () => {
  assert.equal(isConnectionError(new Error('ECONNREFUSED connection refused')), true);
  assert.equal(isConnectionError(new Error('socket hang up')), true);
  assert.equal(isConnectionError(new Error('Server closed the connection')), true);
  assert.equal(isConnectionError(new Error('duplicate key value violates unique constraint')), false);
  assert.equal(isConnectionError(), false);
});

test('isDuplicateKeyError detects PostgreSQL and SQL Server violations', () => {
  assert.equal(isDuplicateKeyError({ code: '23505' }), true);
  assert.equal(isDuplicateKeyError({ number: 2627 }), true);
  assert.equal(isDuplicateKeyError({ number: 2601 }), true);
  assert.equal(isDuplicateKeyError(new Error('Cannot insert duplicate key row in object')), true);
  assert.equal(isDuplicateKeyError(new Error('some other database error')), false);
  assert.equal(isDuplicateKeyError(), false);
});