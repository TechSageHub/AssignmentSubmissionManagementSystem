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
  const paginated = await findAllPaginated(lecturerId, {});
  return paginated.items;
}

async function findAllPaginated(lecturerId, { limit, offset, search } = {}) {
  const hasPagination = Number.isInteger(limit) || Number.isInteger(offset) || (typeof search === 'string' && search.length > 0);
  const limitVal = hasPagination ? Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200) : null;
  const offsetVal = hasPagination ? Math.max(parseInt(offset, 10) || 0, 0) : null;
  const searchTerm = typeof search === 'string' ? search.trim() : '';
  const params = { lecturerId };
  let whereSearch = '';
  if (searchTerm) {
    whereSearch = 'AND (a.title LIKE @search OR u.name LIKE @search)';
    params.search = `%${searchTerm}%`;
  }
  const base = `FROM Submissions s
     JOIN Assignments a ON a.id = s.assignment_id
     JOIN Users u ON u.id = s.student_id
     LEFT JOIN Grades g ON g.submission_id = s.id
     WHERE a.lecturer_id = @lecturerId ${whereSearch}`;
  if (!hasPagination) {
    const result = await query(`SELECT s.*, a.title AS assignment_title, u.name AS student_name, g.score, g.feedback, g.graded_at AS grade_graded_at ${base} ORDER BY s.submitted_at DESC, s.id DESC`, params);
    return { items: result.recordset, total: result.recordset.length, limit: result.recordset.length, offset: 0 };
  }
  const countResult = await query(`SELECT COUNT(*) AS count ${base}`, params);
  params.limit = limitVal;
  params.offset = offsetVal;
  const result = await query(`SELECT s.*, a.title AS assignment_title, u.name AS student_name, g.score, g.feedback, g.graded_at AS grade_graded_at ${base} ORDER BY s.submitted_at DESC, s.id DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, params);
  return { items: result.recordset, total: Number(countResult.recordset[0].count), limit: limitVal, offset: offsetVal };
}

async function findByAssignment(assignmentId) {
  const paginated = await findByAssignmentPaginated(assignmentId, {});
  return paginated.items;
}

async function findByAssignmentPaginated(assignmentId, { limit, offset, search } = {}) {
  const hasPagination = Number.isInteger(limit) || Number.isInteger(offset) || (typeof search === 'string' && search.length > 0);
  const limitVal = hasPagination ? Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200) : null;
  const offsetVal = hasPagination ? Math.max(parseInt(offset, 10) || 0, 0) : null;
  const searchTerm = typeof search === 'string' ? search.trim() : '';
  const params = { assignmentId };
  let whereSearch = '';
  if (searchTerm) {
    whereSearch = 'AND u.name LIKE @search';
    params.search = `%${searchTerm}%`;
  }
  const base = `FROM Submissions s
     JOIN Users u ON u.id = s.student_id
     LEFT JOIN Grades g ON g.submission_id = s.id
     WHERE s.assignment_id = @assignmentId ${whereSearch}`;
  if (!hasPagination) {
    const result = await query(`SELECT s.*, u.name AS student_name, g.id AS grade_id, g.score, g.feedback, g.graded_at AS grade_graded_at ${base} ORDER BY s.submitted_at DESC, s.id DESC`, params);
    return { items: result.recordset, total: result.recordset.length, limit: result.recordset.length, offset: 0 };
  }
  const countResult = await query(`SELECT COUNT(*) AS count ${base}`, params);
  params.limit = limitVal;
  params.offset = offsetVal;
  const result = await query(`SELECT s.*, u.name AS student_name, g.id AS grade_id, g.score, g.feedback, g.graded_at AS grade_graded_at ${base} ORDER BY s.submitted_at DESC, s.id DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, params);
  return { items: result.recordset, total: Number(countResult.recordset[0].count), limit: limitVal, offset: offsetVal };
}

async function findByStudent(studentId) {
  const paginated = await findByStudentPaginated(studentId, {});
  return paginated.items;
}

async function findByStudentPaginated(studentId, { limit, offset, search } = {}) {
  const hasPagination = Number.isInteger(limit) || Number.isInteger(offset) || (typeof search === 'string' && search.length > 0);
  const limitVal = hasPagination ? Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200) : null;
  const offsetVal = hasPagination ? Math.max(parseInt(offset, 10) || 0, 0) : null;
  const searchTerm = typeof search === 'string' ? search.trim() : '';
  const params = { studentId };
  let whereSearch = '';
  if (searchTerm) {
    whereSearch = 'AND a.title LIKE @search';
    params.search = `%${searchTerm}%`;
  }
  const base = `FROM Submissions s
     JOIN Assignments a ON a.id = s.assignment_id
     LEFT JOIN Grades g ON g.submission_id = s.id
     WHERE (s.student_id = @studentId OR EXISTS (SELECT 1 FROM GroupMembers gm WHERE gm.submission_id = s.id AND gm.user_id = @studentId)) ${whereSearch}`;
  if (!hasPagination) {
    const result = await query(`SELECT s.*, a.title AS assignment_title, a.due_date, g.score, g.feedback, g.graded_at AS grade_graded_at, g.released_at AS grade_released_at ${base} ORDER BY s.submitted_at DESC, s.id DESC`, params);
    return { items: result.recordset, total: result.recordset.length, limit: result.recordset.length, offset: 0 };
  }
  const countResult = await query(`SELECT COUNT(*) AS count ${base}`, params);
  params.limit = limitVal;
  params.offset = offsetVal;
  const result = await query(`SELECT s.*, a.title AS assignment_title, a.due_date, g.score, g.feedback, g.graded_at AS grade_graded_at, g.released_at AS grade_released_at ${base} ORDER BY s.submitted_at DESC, s.id DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, params);
  return { items: result.recordset, total: Number(countResult.recordset[0].count), limit: limitVal, offset: offsetVal };
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

module.exports = { create, findAll, findAllPaginated, findByAssignment, findByAssignmentPaginated, findByStudent, findByStudentPaginated, findById, findByAssignmentAndStudent, remove };
