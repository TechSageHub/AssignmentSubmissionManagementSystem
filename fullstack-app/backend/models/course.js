const { query } = require('../config/db');

async function findAllForLookup() {
  const result = await query(
    'SELECT id, code, title, department FROM Courses ORDER BY code'
  );
  return result.recordset;
}

async function findAll({ search = '', limit = 20, offset = 0 }) {
  const params = { limit, offset };
  const where = [];
  if (search) {
    where.push('(code LIKE @search OR title LIKE @search OR department LIKE @search)');
    params.search = `%${search}%`;
  }
  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const countResult = await query(`SELECT COUNT(*) AS count FROM Courses ${whereSql}`, params);
  const result = await query(
    `SELECT c.id, c.code, c.title, c.department, c.created_at,
            (SELECT COUNT(*) FROM Assignments a WHERE a.course_id = c.id) AS assignment_count
     FROM Courses c
     ${whereSql}
     ORDER BY c.code
     OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
    params
  );
  return { items: result.recordset, total: Number(countResult.recordset[0].count) };
}

async function findById(id) {
  const result = await query('SELECT * FROM Courses WHERE id = @id', { id });
  return result.recordset[0] || null;
}

async function create({ code, title, department }) {
  const result = await query(
    `INSERT INTO Courses (code, title, department)
     OUTPUT INSERTED.*
     VALUES (@code, @title, @department)`,
    { code, title, department: department || null }
  );
  return result.recordset[0];
}

async function update(id, { code, title, department }) {
  const result = await query(
    `UPDATE Courses
     SET code = @code, title = @title, department = @department
     OUTPUT INSERTED.*
     WHERE id = @id`,
    { id, code, title, department: department || null }
  );
  return result.recordset[0] || null;
}

async function remove(id) {
  const result = await query(
    `DELETE FROM Courses OUTPUT DELETED.id WHERE id = @id`,
    { id }
  );
  return result.rowsAffected[0] > 0;
}

module.exports = { findAllForLookup, findAll, findById, create, update, remove };