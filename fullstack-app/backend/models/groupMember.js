const { query } = require('../config/db');

async function addMembers(submissionId, userIds) {
  for (const userId of userIds) {
    await query(
      'INSERT INTO GroupMembers (submission_id, user_id) VALUES (@submissionId, @userId)',
      { submissionId, userId }
    );
  }
}

async function findBySubmission(submissionId) {
  const result = await query(
    `SELECT gm.user_id, u.name AS user_name
     FROM GroupMembers gm
     JOIN Users u ON u.id = gm.user_id
     WHERE gm.submission_id = @submissionId`,
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
    `SELECT gm.submission_id, gm.user_id, u.name AS user_name
     FROM GroupMembers gm
     JOIN Users u ON u.id = gm.user_id
     WHERE gm.submission_id IN (${ids})`,
    params
  );
  const grouped = {};
  for (const row of result.recordset) {
    if (!grouped[row.submission_id]) grouped[row.submission_id] = [];
    grouped[row.submission_id].push({ user_id: row.user_id, user_name: row.user_name });
  }
  return grouped;
}

async function removeBySubmission(submissionId) {
  await query('DELETE FROM GroupMembers WHERE submission_id = @submissionId', { submissionId });
}

module.exports = { addMembers, findBySubmission, findBySubmissions, removeBySubmission };
