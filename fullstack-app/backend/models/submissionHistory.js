const { query } = require('../config/db');

async function findBySubmission(submissionId) {
  const result = await query(
    `SELECT * FROM SubmissionHistory
     WHERE submission_id = @submissionId
     ORDER BY version_number ASC`,
    { submissionId }
  );
  return result.recordset;
}

async function archive({ submissionId, filePath, originalName, isLate, submittedAt, filesJson }) {
  const result = await query(
    `INSERT INTO SubmissionHistory (submission_id, version_number, file_path, original_name, is_late, submitted_at, files_json)
     OUTPUT INSERTED.*
     SELECT @submissionId, COALESCE(MAX(version_number), -1) + 1, @filePath, @originalName, @isLate, @submittedAt, @filesJson
     FROM SubmissionHistory
     WHERE submission_id = @submissionId`,
    { submissionId, filePath, originalName, isLate, submittedAt, filesJson }
  );
  return result.recordset[0];
}

module.exports = { findBySubmission, archive };