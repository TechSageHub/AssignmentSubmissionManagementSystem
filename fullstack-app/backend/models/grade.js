const { query, isDuplicateKeyError } = require('../config/db');

async function upsert({ submissionId, score, feedback, releasedAt }) {
  const existing = await query('SELECT * FROM Grades WHERE submission_id = @submissionId', { submissionId });
  if (existing.recordset[0]) {
    const result = await query(
      `UPDATE Grades SET score = @score, feedback = @feedback, released_at = @releasedAt, updated_at = GETDATE()
       OUTPUT INSERTED.*
       WHERE submission_id = @submissionId`,
      { submissionId, score, feedback, releasedAt }
    );
    return result.recordset[0];
  }
  try {
    const result = await query(
      `INSERT INTO Grades (submission_id, score, feedback, released_at)
       OUTPUT INSERTED.*
       VALUES (@submissionId, @score, @feedback, @releasedAt)`,
      { submissionId, score, feedback, releasedAt }
    );
    return result.recordset[0];
  } catch (err) {
    // A concurrent request inserted the grade between our SELECT and INSERT.
    // This is now safe thanks to UNIQUE(submission_id) — convert the race into an UPDATE.
    if (isDuplicateKeyError(err)) {
      const result = await query(
        `UPDATE Grades SET score = @score, feedback = @feedback, released_at = @releasedAt, updated_at = GETDATE()
         OUTPUT INSERTED.*
         WHERE submission_id = @submissionId`,
        { submissionId, score, feedback, releasedAt }
      );
      return result.recordset[0];
    }
    throw err;
  }
}

async function findBySubmission(submissionId) {
  const result = await query('SELECT * FROM Grades WHERE submission_id = @submissionId', { submissionId });
  return result.recordset[0] || null;
}

async function findByStudent(studentId) {
  const result = await query(
    `SELECT g.*, s.assignment_id, a.title AS assignment_title
     FROM Grades g
     JOIN Submissions s ON s.id = g.submission_id
     JOIN Assignments a ON a.id = s.assignment_id
     WHERE s.student_id = @studentId
     ORDER BY g.graded_at DESC`,
    { studentId }
  );
  return result.recordset;
}

module.exports = { upsert, findBySubmission, findByStudent };
