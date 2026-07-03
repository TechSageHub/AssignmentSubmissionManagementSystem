const { query } = require('../config/db');

function buildAssignmentCreateQuery(includeCourseFields = true) {
  const columns = ['lecturer_id', 'title', 'description', 'due_date'];
  const values = ['@lecturerId', '@title', '@description', '@dueDate'];

  if (includeCourseFields) {
    columns.push('course_code', 'course_title');
    values.push('@courseCode', '@courseTitle');
  }

  return `INSERT INTO Assignments (${columns.join(', ')})\n     OUTPUT INSERTED.*\n     VALUES (${values.join(', ')})`;
}

function buildAssignmentUpdateQuery(includeCourseFields = true) {
  const setParts = ['title = @title', 'description = @description', 'due_date = @dueDate'];

  if (includeCourseFields) {
    setParts.push('course_code = @courseCode', 'course_title = @courseTitle');
  }

  setParts.push('updated_at = GETDATE()');

  return `UPDATE Assignments\n     SET ${setParts.join(', ')}\n     OUTPUT INSERTED.*\n     WHERE id = @id`;
}

function isMissingColumnError(err, columnName) {
  const message = (err && (err.message || err.details || ''))?.toString() || '';
  if (!message) return false;

  const escapedColumnName = columnName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escapedColumnName}\\b`, 'i').test(message)
    && /(invalid column name|column .* does not exist|does not exist|undefined column)/i.test(message);
}

async function create({ lecturerId, title, description, dueDate, courseCode, courseTitle }) {
  const attempts = [true, false];
  let lastError;

  for (const includeCourseFields of attempts) {
    try {
      const result = await query(buildAssignmentCreateQuery(includeCourseFields), { lecturerId, title, description, dueDate, courseCode, courseTitle });
      return result.recordset[0];
    } catch (err) {
      if (includeCourseFields && (isMissingColumnError(err, 'course_code') || isMissingColumnError(err, 'course_title'))) {
        lastError = err;
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}

async function findAll(lecturerId, role) {
  if (role === 'lecturer') {
    const result = await query(
      'SELECT * FROM Assignments WHERE lecturer_id = @lecturerId ORDER BY created_at DESC',
      { lecturerId }
    );
    return result.recordset;
  }
  const result = await query(
    `SELECT a.*,
      CASE WHEN s.id IS NOT NULL THEN 1 ELSE 0 END AS has_submitted,
      CASE WHEN s.is_late = 1 THEN 1 ELSE 0 END AS is_late_submission
     FROM Assignments a
     LEFT JOIN Submissions s ON s.assignment_id = a.id AND s.student_id = @lecturerId
     ORDER BY a.created_at DESC`,
    { lecturerId }
  );
  return result.recordset;
}

async function findById(id) {
  const result = await query('SELECT * FROM Assignments WHERE id = @id', { id });
  return result.recordset[0] || null;
}

async function update(id, { title, description, dueDate, courseCode, courseTitle }) {
  const attempts = [true, false];
  let lastError;

  for (const includeCourseFields of attempts) {
    try {
      const result = await query(buildAssignmentUpdateQuery(includeCourseFields), { id, title, description, dueDate, courseCode, courseTitle });
      return result.recordset[0] || null;
    } catch (err) {
      if (includeCourseFields && (isMissingColumnError(err, 'course_code') || isMissingColumnError(err, 'course_title'))) {
        lastError = err;
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}

async function remove(id) {
  const result = await query(
    `DELETE FROM Assignments OUTPUT DELETED.id WHERE id = @id`,
    { id }
  );
  return result.rowsAffected[0] > 0;
}

module.exports = { buildAssignmentCreateQuery, buildAssignmentUpdateQuery, isMissingColumnError, create, findAll, findById, update, remove };
