const { query } = require('../config/db');

async function create({ userId, type, title, message, link }) {
  const result = await query(
    `INSERT INTO Notifications (user_id, type, title, message, link)
     OUTPUT INSERTED.*
     VALUES (@userId, @type, @title, @message, @link)`,
    { userId, type, title, message, link }
  );
  return result.recordset[0];
}

async function findByUser(userId, { limit = 20, offset = 0, unreadOnly = false }) {
  let sql = 'SELECT * FROM Notifications WHERE user_id = @userId';
  const params = { userId };
  if (unreadOnly) {
    sql += ' AND is_read = 0';
  }
  sql += ' ORDER BY created_at DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY';
  params.offset = offset;
  params.limit = limit;
  const result = await query(sql, params);
  return result.recordset;
}

async function countUnread(userId) {
  const result = await query(
    'SELECT COUNT(*) as count FROM Notifications WHERE user_id = @userId AND is_read = 0',
    { userId }
  );
  return result.recordset[0].count;
}

async function markAsRead(id, userId) {
  await query(
    'UPDATE Notifications SET is_read = 1 WHERE id = @id AND user_id = @userId',
    { id, userId }
  );
}

async function markAllAsRead(userId) {
  await query(
    'UPDATE Notifications SET is_read = 1 WHERE user_id = @userId AND is_read = 0',
    { userId }
  );
}

module.exports = { create, findByUser, countUnread, markAsRead, markAllAsRead };
