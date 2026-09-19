const { query } = require('../config/db');
const { matchesLevel, isTargetLevelAllowed } = require('../utils/academic');

async function create({ title, message, createdBy, targetRole = 'all', targetDepartment = null, targetLevel = null }) {
  const result = await query(
    `INSERT INTO Announcements (title, message, created_by, target_role, target_department, target_level)
     OUTPUT INSERTED.*
     VALUES (@title, @message, @createdBy, @targetRole, @targetDepartment, @targetLevel)`,
    { title, message, createdBy, targetRole, targetDepartment, targetLevel }
  );
  return result.recordset[0];
}

async function findById(id) {
  const result = await query(
    `SELECT a.*, u.name AS author_name
     FROM Announcements a
     JOIN Users u ON u.id = a.created_by
     WHERE a.id = @id`,
    { id }
  );
  return result.recordset[0] || null;
}

async function update(id, fields) {
  const result = await query(
    `UPDATE Announcements
     SET title = @title, message = @message, target_role = @targetRole,
         target_department = @targetDepartment, target_level = @targetLevel,
         updated_at = GETDATE()
     OUTPUT INSERTED.*
     WHERE id = @id`,
    { id, ...fields }
  );
  return result.recordset[0] || null;
}

async function remove(id) {
  await query('DELETE FROM Announcements WHERE id = @id', { id });
}

// Announcements visible to a given viewer. Role + department are applied in SQL;
// level matching needs the app's robust matchesLevel/isTargetLevelAllowed rules,
// so it is applied per row after the cheap filters.
async function findByVisible({ role, department, level, levelScope }) {
  const result = await query(
    `SELECT a.*, u.name AS author_name
     FROM Announcements a
     JOIN Users u ON u.id = a.created_by
     WHERE (a.target_role = 'all' OR a.target_role = @role)
       AND (a.target_department IS NULL OR a.target_department = @department)
     ORDER BY a.published_at DESC`,
    { role, department }
  );
  return result.recordset.filter(a => {
    if (!a.target_level) return true;
    if (a.target_level === 'All Levels' || a.target_level.toLowerCase() === 'all') return true;
    if (role === 'student') return matchesLevel(level, a.target_level);
    if (role === 'lecturer') return isTargetLevelAllowed(levelScope, a.target_level);
    return true; // admins always see advertised levels
  });
}

// Users who match an announcement's targeting, for delivery.
async function findTargetUsers({ targetRole, targetDepartment, targetLevel }) {
  const result = await query(
    `SELECT id, name, email, role, department, level, level_scope
     FROM Users
     WHERE (@targetRole = 'all' OR role = @targetRole)
       AND (@targetDepartment IS NULL OR department = @targetDepartment)`,
    { targetRole, targetDepartment }
  );
  return result.recordset.filter(u => {
    if (!targetLevel) return true;
    if (targetLevel === 'All Levels' || targetLevel.toLowerCase() === 'all') return true;
    if (u.role === 'student') return matchesLevel(u.level, targetLevel);
    if (u.role === 'lecturer') return isTargetLevelAllowed(u.level_scope, targetLevel);
    return true;
  });
}

module.exports = { create, findById, update, remove, findByVisible, findTargetUsers };