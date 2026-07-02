const { query } = require('../config/db');

async function createMany(submissionId, files) {
  const created = [];
  for (const file of files) {
    const result = await query(
      `INSERT INTO SubmissionFiles (submission_id, file_path, original_name, file_size, mime_type)
       OUTPUT INSERTED.*
       VALUES (@submissionId, @filePath, @originalName, @fileSize, @mimeType)`,
      {
        submissionId,
        filePath: file.filePath,
        originalName: file.originalName,
        fileSize: file.fileSize ?? 0,
        mimeType: file.mimeType || null,
      }
    );
    created.push(result.recordset[0] || null);
  }
  return created.filter(Boolean);
}

async function findBySubmission(submissionId) {
  const result = await query(
    'SELECT * FROM SubmissionFiles WHERE submission_id = @submissionId ORDER BY id',
    { submissionId }
  );
  return result.recordset;
}

async function findById(id) {
  const result = await query('SELECT * FROM SubmissionFiles WHERE id = @id', { id });
  return result.recordset[0] || null;
}

async function removeBySubmission(submissionId) {
  await query('DELETE FROM SubmissionFiles WHERE submission_id = @submissionId', { submissionId });
}

module.exports = { createMany, findBySubmission, findById, removeBySubmission };
