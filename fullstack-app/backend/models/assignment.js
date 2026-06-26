const { query } = require('../config/db');

async function create({ lecturerId, title, description, dueDate, courseCode, courseTitle }) {
  const result = await query(
    `INSERT INTO Assignments (lecturer_id, title, description, due_date, course_code, course_title)
     OUTPUT INSERTED.*
     VALUES (@lecturerId, @title, @description, @dueDate, @courseCode, @courseTitle)`,
    { lecturerId, title, description, dueDate, courseCode, courseTitle }
  );
  return result.recordset[0];
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
  const result = await query(
    `UPDATE Assignments
     SET title = @title, description = @description, due_date = @dueDate,
         course_code = @courseCode, course_title = @courseTitle, updated_at = GETDATE()
     OUTPUT INSERTED.*
     WHERE id = @id`,
    { id, title, description, dueDate, courseCode, courseTitle }
  );
  return result.recordset[0] || null;
}

async function remove(id) {
  const result = await query(
    `DELETE FROM Assignments OUTPUT DELETED.id WHERE id = @id`,
    { id }
  );
  return result.rowsAffected[0] > 0;
}

module.exports = { create, findAll, findById, update, remove };
