const { query, withTransaction, isDuplicateKeyError } = require('../config/db');

async function upsertTx(exec, { submissionId, score, feedback, releasedAt }) {
  const existing = await exec('SELECT * FROM Grades WHERE submission_id = @submissionId', { submissionId });
  if (existing.recordset[0]) {
    const result = await exec(
      `UPDATE Grades SET score = @score, feedback = @feedback, released_at = @releasedAt, updated_at = GETDATE()
       OUTPUT INSERTED.*
       WHERE submission_id = @submissionId`,
      { submissionId, score, feedback, releasedAt }
    );
    return result.recordset[0];
  }
  try {
    const result = await exec(
      `INSERT INTO Grades (submission_id, score, feedback, released_at)
       OUTPUT INSERTED.*
       VALUES (@submissionId, @score, @feedback, @releasedAt)`,
      { submissionId, score, feedback, releasedAt }
    );
    return result.recordset[0];
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      const result = await exec(
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

async function upsert({ submissionId, score, feedback, releasedAt }) {
  return withTransaction(async ({ exec }) => upsertTx(exec, { submissionId, score, feedback, releasedAt }));
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

module.exports = { upsert, upsertTx, findBySubmission, findByStudent };
