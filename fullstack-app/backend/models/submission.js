const { query } = require('../config/db');

async function create({ assignmentId, studentId, filePath, originalName, isLate }) {
  const result = await query(
    `INSERT INTO Submissions (assignment_id, student_id, file_path, original_name, is_late)
     OUTPUT INSERTED.*
     VALUES (@assignmentId, @studentId, @filePath, @originalName, @isLate)`,
    { assignmentId, studentId, filePath, originalName, isLate }
  );
  return result.recordset[0];
}

async function findAll(lecturerId) {
  const result = await query(
    `SELECT s.*, a.title AS assignment_title, u.name AS student_name,
            g.score, g.feedback, g.graded_at AS grade_graded_at
     FROM Submissions s
     JOIN Assignments a ON a.id = s.assignment_id
     JOIN Users u ON u.id = s.student_id
     LEFT JOIN Grades g ON g.submission_id = s.id
     WHERE a.lecturer_id = @lecturerId
     ORDER BY s.submitted_at DESC`,
    { lecturerId }
  );
  return result.recordset;
}

async function findByAssignment(assignmentId) {
  const result = await query(
    `SELECT s.*, u.name AS student_name
     FROM Submissions s
     JOIN Users u ON u.id = s.student_id
     WHERE s.assignment_id = @assignmentId
     ORDER BY s.submitted_at DESC`,
    { assignmentId }
  );
  return result.recordset;
}

async function findByStudent(studentId) {
  const result = await query(
    `SELECT s.*, a.title AS assignment_title, a.due_date,
            g.score, g.feedback, g.graded_at AS grade_graded_at
     FROM Submissions s
     JOIN Assignments a ON a.id = s.assignment_id
     LEFT JOIN Grades g ON g.submission_id = s.id
     WHERE s.student_id = @studentId
     ORDER BY s.submitted_at DESC`,
    { studentId }
  );
  return result.recordset;
}

async function findById(id) {
  const result = await query(
    `SELECT s.*, u.name AS student_name, a.title AS assignment_title
     FROM Submissions s
     JOIN Users u ON u.id = s.student_id
     JOIN Assignments a ON a.id = s.assignment_id
     WHERE s.id = @id`,
    { id }
  );
  return result.recordset[0] || null;
}

async function findByAssignmentAndStudent(assignmentId, studentId) {
  const result = await query(
    'SELECT * FROM Submissions WHERE assignment_id = @assignmentId AND student_id = @studentId',
    { assignmentId, studentId }
  );
  return result.recordset[0] || null;
}

async function remove(id) {
  await query('DELETE FROM Submissions WHERE id = @id', { id });
}

module.exports = { create, findAll, findByAssignment, findByStudent, findById, findByAssignmentAndStudent, remove };
