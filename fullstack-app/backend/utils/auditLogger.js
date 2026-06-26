const { query } = require('../config/db');

async function log(req, action, entityType, entityId, details) {
  try {
    await query(
      `INSERT INTO AuditLog (user_id, user_name, action, entity_type, entity_id, details, ip_address)
       VALUES (@userId, @userName, @action, @entityType, @entityId, @details, @ip)`,
      {
        userId: req.user?.id || null,
        userName: req.user?.name || 'anonymous',
        action,
        entityType: entityType || null,
        entityId: entityId || null,
        details: details ? JSON.stringify(details) : null,
        ip: req.ip || req.connection?.remoteAddress || null,
      }
    );
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
}

async function findAll(limit = 100) {
  const result = await query(
    'SELECT * FROM AuditLog ORDER BY created_at DESC OFFSET 0 ROWS FETCH NEXT @limit ROWS ONLY',
    { limit }
  );
  return result.recordset;
}

module.exports = { log, findAll };
