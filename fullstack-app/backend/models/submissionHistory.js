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

async function findBySubmissions(submissionIds) {
  if (!submissionIds.length) return {};
  const ids = submissionIds.map((_, i) => `@id${i}`).join(',');
  const params = {};
  submissionIds.forEach((id, i) => { params[`id${i}`] = id; });
  const result = await query(
    `SELECT * FROM SubmissionHistory WHERE submission_id IN (${ids}) ORDER BY submission_id, version_number ASC`,
    params
  );
  const grouped = {};
  for (const row of result.recordset) {
    if (!grouped[row.submission_id]) grouped[row.submission_id] = [];
    grouped[row.submission_id].push(row);
  }
  return grouped;
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

module.exports = { findBySubmission, findBySubmissions, archive };