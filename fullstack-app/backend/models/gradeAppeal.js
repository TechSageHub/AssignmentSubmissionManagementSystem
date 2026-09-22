const { query } = require('../config/db');

// Pure eligibility check so it can be unit-tested without a DB.
// Returns { ok } or { ok: false, status, details }.
function resolveAppealEligibility({ grade, existingAppeal }) {
  if (!grade) {
    return { ok: false, status: 409, details: 'This submission has not been graded yet' };
  }
  const releasedAt = grade.released_at != null ? new Date(grade.released_at) : null;
  if (!releasedAt || releasedAt > new Date()) {
    return { ok: false, status: 409, details: 'You can only appeal a grade after it has been released' };
  }
  if (existingAppeal) {
    return { ok: false, status: 409, details: 'An appeal already exists for this submission' };
  }
  return { ok: true };
}

async function create({ submissionId, studentId, reason }) {
  const result = await query(
    `INSERT INTO GradeAppeals (submission_id, student_id, reason)
     OUTPUT INSERTED.*
     VALUES (@submissionId, @studentId, @reason)`,
    { submissionId, studentId, reason }
  );
  return result.recordset[0];
}

async function findById(id) {
  const result = await query('SELECT * FROM GradeAppeals WHERE id = @id', { id });
  return result.recordset[0] || null;
}

async function findBySubmission(submissionId) {
  const result = await query('SELECT * FROM GradeAppeals WHERE submission_id = @submissionId', { submissionId });
  return result.recordset[0] || null;
}

async function findByStudent(studentId) {
  const result = await query(
    `SELECT a.*, s.assignment_id, s.original_name AS file_name, ass.title AS assignment_title
     FROM GradeAppeals a
     JOIN Submissions s ON s.id = a.submission_id
     JOIN Assignments ass ON ass.id = s.assignment_id
     WHERE a.student_id = @studentId
     ORDER BY a.requested_at DESC`,
    { studentId }
  );
  return result.recordset;
}

async function findByLecturer(lecturerId, { status = null, limit = 50, offset = 0 }) {
  const params = { lecturerId, limit, offset };
  const where = ['ass.lecturer_id = @lecturerId'];
  if (status && status !== 'all') {
    where.push('a.status = @status');
    params.status = status;
  }
  const whereSql = where.join(' AND ');

  const countResult = await query(
    `SELECT COUNT(*) AS count
     FROM GradeAppeals a
     JOIN Submissions s ON s.id = a.submission_id
     JOIN Assignments ass ON ass.id = s.assignment_id
     WHERE ${whereSql}`,
    params
  );

  const result = await query(
    `SELECT a.*, u.name AS student_name, u.email AS student_email, s.assignment_id,
            s.original_name AS file_name, ass.title AS assignment_title
     FROM GradeAppeals a
     JOIN Users u ON u.id = a.student_id
     JOIN Submissions s ON s.id = a.submission_id
     JOIN Assignments ass ON ass.id = s.assignment_id
     WHERE ${whereSql}
     ORDER BY CASE WHEN a.status = 'open' THEN 0 ELSE 1 END, a.requested_at DESC
     OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
    params
  );

  return {
    items: result.recordset,
    total: Number(countResult.recordset[0].count),
    limit,
    offset,
  };
}

// Close an appeal as rejected. Guarded so a concurrent resolution can't double-close.
async function reject(id, lecturerComment) {
  const result = await query(
    `UPDATE GradeAppeals SET status = 'rejected', lecturer_comment = @lecturerComment, resolved_at = GETDATE()
     WHERE id = @id AND status = 'open'`,
    { id, lecturerComment }
  );
  return result.rowsAffected[0] > 0;
}

// Close an appeal as accepted after the grade has been updated. Guarded so a
// concurrent resolution can't double-close.
async function resolveAccepted(id, { lecturerComment, oldScore, newScore }) {
  const result = await query(
    `UPDATE GradeAppeals
     SET status = 'accepted', lecturer_comment = @lecturerComment,
         old_score = @oldScore, new_score = @newScore, resolved_at = GETDATE()
     WHERE id = @id AND status = 'open'`,
    { id, lecturerComment, oldScore, newScore }
  );
  return result.rowsAffected[0] > 0;
}

async function countOpenByLecturer(lecturerId) {
  const result = await query(
    `SELECT COUNT(*) AS count
     FROM GradeAppeals a
     JOIN Submissions s ON s.id = a.submission_id
     JOIN Assignments ass ON ass.id = s.assignment_id
     WHERE ass.lecturer_id = @lecturerId AND a.status = 'open'`,
    { lecturerId }
  );
  return Number(result.recordset[0].count);
}

module.exports = {
  resolveAppealEligibility,
  create,
  findById,
  findBySubmission,
  findByStudent,
  findByLecturer,
  reject,
  resolveAccepted,
  countOpenByLecturer,
};