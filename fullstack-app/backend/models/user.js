const { query } = require('../config/db');

function buildUserFindByIdQuery(includeMustChangePassword = true, includeLevelScope = true) {
  const columns = [
    'id', 'name', 'email', 'username', 'role', 'is_verified', 'is_active',
    'student_id', 'staff_id', 'department', 'programme', 'level', 'phone'
  ];

  if (includeMustChangePassword) {
    columns.push('must_change_password');
  }
  if (includeLevelScope) {
    columns.push('level_scope');
  }

  columns.push('created_at');
  return `SELECT ${columns.join(', ')} FROM Users WHERE id = @id`;
}

function isMissingColumnError(err, columnName) {
  const message = (err && (err.message || err.details || ''))?.toString() || '';
  if (!message) return false;

  const escapedColumnName = columnName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escapedColumnName}\\b`, 'i').test(message)
    && /(invalid column name|column .* does not exist|does not exist|undefined column)/i.test(message);
}

async function findByEmail(email) {
  const result = await query('SELECT * FROM Users WHERE email = @email', { email });
  return result.recordset[0] || null;
}

async function findByUsername(username) {
  const result = await query('SELECT * FROM Users WHERE username = @username', { username });
  return result.recordset[0] || null;
}

async function findByEmailOrUsername(login) {
  const result = await query(
    'SELECT * FROM Users WHERE email = @login OR username = @login',
    { login }
  );
  return result.recordset[0] || null;
}

async function findById(id) {
  const attempts = [
    { includeMustChange: true, includeLevelScope: true },
    { includeMustChange: true, includeLevelScope: false },
    { includeMustChange: false, includeLevelScope: false },
  ];
  let lastError;

  for (const { includeMustChange, includeLevelScope } of attempts) {
    try {
      const result = await query(buildUserFindByIdQuery(includeMustChange, includeLevelScope), { id });
      return result.recordset[0] || null;
    } catch (err) {
      if (includeLevelScope && isMissingColumnError(err, 'level_scope')) {
        lastError = err;
        continue;
      }
      if (includeMustChange && isMissingColumnError(err, 'must_change_password')) {
        lastError = err;
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}

const crypto = require('crypto');

function generateUsername(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.{2,}/g, '.').replace(/^\.|\.$/g, '');
}

async function createUser({ name, email, passwordHash, role, username, studentId, staffId, department, programme, level, phone, mustChangePassword = false, levelScope = null }) {
  if (!username) {
    username = generateUsername(name);
    const existing = await findByUsername(username);
    if (existing) {
      username = username + Math.floor(1000 + Math.random() * 9000);
    }
  }
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const mustChange = Boolean(mustChangePassword);

  const attempts = [
    { includeMustChange: true, includeLevelScope: true },
    { includeMustChange: true, includeLevelScope: false },
    { includeMustChange: false, includeLevelScope: false },
  ];
  let lastError;

  for (const { includeMustChange, includeLevelScope } of attempts) {
    try {
      const cols = ['name', 'email', 'password_hash', 'role', 'username', 'student_id', 'staff_id', 'department', 'programme', 'level', 'phone'];
      const vals = ['@name', '@email', '@passwordHash', '@role', '@username', '@studentId', '@staffId', '@department', '@programme', '@level', '@phone'];

      if (includeMustChange) {
        cols.push('must_change_password');
        vals.push('@mustChange');
      }
      if (includeLevelScope) {
        cols.push('level_scope');
        vals.push('@levelScope');
      }
      cols.push('verification_token', 'verification_token_expires');
      vals.push('@token', '@expires');

      const result = await query(
        `INSERT INTO Users (${cols.join(', ')})
         OUTPUT INSERTED.id, INSERTED.name, INSERTED.email, INSERTED.role, INSERTED.username, INSERTED.created_at, INSERTED.verification_token
         VALUES (${vals.join(', ')})`,
        { name, email, passwordHash, role, username, studentId, staffId, department, programme, level, phone, mustChange, levelScope, token, expires }
      );
      return result.recordset[0];
    } catch (err) {
      if (includeLevelScope && isMissingColumnError(err, 'level_scope')) {
        lastError = err;
        continue;
      }
      if (includeMustChange && isMissingColumnError(err, 'must_change_password')) {
        lastError = err;
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}

async function findByVerificationToken(token) {
  const result = await query(
    `SELECT * FROM Users WHERE verification_token = @token AND verification_token_expires > GETDATE()`,
    { token }
  );
  return result.recordset[0] || null;
}

async function verifyUser(id) {
  await query(
    `UPDATE Users SET is_verified = 1, verification_token = NULL, verification_token_expires = NULL WHERE id = @id`,
    { id }
  );
}

async function setVerificationToken(email) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await query(
    `UPDATE Users SET verification_token = @token, verification_token_expires = @expires WHERE email = @email`,
    { token, expires, email }
  );
  return token;
}

async function findAll() {
  const result = await query(
    'SELECT id, name, email, role, is_verified, is_active, created_at FROM Users ORDER BY created_at DESC'
  );
  return result.recordset;
}

async function findAllPaginated({ search, limit = 50, offset = 0 }) {
  const params = { limit, offset };
  const where = [];
  if (search) {
    where.push('(name LIKE @search OR email LIKE @search)');
    params.search = `%${search}%`;
  }
  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const countResult = await query(`SELECT COUNT(*) AS count FROM Users ${whereSql}`, params);
  const result = await query(
    `SELECT id, name, email, role, is_verified, is_active, created_at
     FROM Users
     ${whereSql}
     ORDER BY created_at DESC, id DESC
     OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
    params
  );
  return { items: result.recordset, total: Number(countResult.recordset[0].count) };
}

async function updateRole(id, role) {
  await query('UPDATE Users SET role = @role WHERE id = @id', { id, role });
}

async function setActiveStatus(id, isActive) {
  await query('UPDATE Users SET is_active = @isActive WHERE id = @id', { id, isActive });
}

async function getStats() {
  const users = await query("SELECT role, COUNT(*) as count FROM Users GROUP BY role");
  const totalUsers = await query("SELECT COUNT(*) as count FROM Users");
  const assignments = await query("SELECT COUNT(*) as count FROM Assignments");
  const submissions = await query("SELECT COUNT(*) as count FROM Submissions");
  const grades = await query("SELECT COUNT(*) as count FROM Grades");
  return {
    users: users.recordset.map((row) => ({ ...row, count: Number(row.count) })),
    totalUsers: Number(totalUsers.recordset[0].count),
    totalAssignments: Number(assignments.recordset[0].count),
    totalSubmissions: Number(submissions.recordset[0].count),
    totalGrades: Number(grades.recordset[0].count),
  };
}

async function findAllStudents() {
  const result = await query(
    "SELECT id, name, email FROM Users WHERE role = 'student' AND (is_active = 1 OR is_active IS NULL)"
  );
  return result.recordset;
}

async function findStudentsByIds(ids) {
  if (!ids || ids.length === 0) return [];
  const idParams = ids.map((_, i) => `@id${i}`).join(',');
  const params = {};
  ids.forEach((id, i) => { params[`id${i}`] = id; });
  const result = await query(
    `SELECT id, name, email FROM Users
     WHERE role = 'student' AND (is_active = 1 OR is_active IS NULL) AND id IN (${idParams})`,
    params
  );
  return result.recordset;
}

async function findByIdWithEmail(id) {
  const result = await query(
    'SELECT id, name, email FROM Users WHERE id = @id',
    { id }
  );
  return result.recordset[0] || null;
}

async function updatePassword(id, newPassword) {
  const bcrypt = require('bcryptjs');
  const hash = await bcrypt.hash(newPassword, 10);

  try {
    await query(
      'UPDATE Users SET password_hash = @hash, must_change_password = 0, verification_token = NULL, verification_token_expires = NULL WHERE id = @id',
      { hash, id }
    );
  } catch (err) {
    if (isMissingColumnError(err, 'must_change_password')) {
      await query(
        'UPDATE Users SET password_hash = @hash, verification_token = NULL, verification_token_expires = NULL WHERE id = @id',
        { hash, id }
      );
      return;
    }
    throw err;
  }
}

async function updateProfile(id, { department, programme, level, phone, levelScope = null }) {
  try {
    const result = await query(
      `UPDATE Users SET department = @department, programme = @programme, level = @level, phone = @phone, level_scope = @levelScope, updated_at = GETDATE()
       OUTPUT INSERTED.id, INSERTED.name, INSERTED.email, INSERTED.username, INSERTED.role,
              INSERTED.student_id, INSERTED.staff_id, INSERTED.department, INSERTED.programme, INSERTED.level, INSERTED.phone, INSERTED.level_scope
       WHERE id = @id`,
      { id, department, programme, level, phone, levelScope }
    );
    return result.recordset[0] || null;
  } catch (err) {
    if (isMissingColumnError(err, 'level_scope')) {
      const fallbackResult = await query(
        `UPDATE Users SET department = @department, programme = @programme, level = @level, phone = @phone, updated_at = GETDATE()
         OUTPUT INSERTED.id, INSERTED.name, INSERTED.email, INSERTED.username, INSERTED.role,
                INSERTED.student_id, INSERTED.staff_id, INSERTED.department, INSERTED.programme, INSERTED.level, INSERTED.phone
         WHERE id = @id`,
        { id, department, programme, level, phone }
      );
      return fallbackResult.recordset[0] || null;
    }
    throw err;
  }
}

async function findStudentsForAssignment({ department, targetLevel }) {
  let result;
  if (department && department.trim()) {
    result = await query(
      `SELECT id, name, email, department, level FROM Users
       WHERE role = 'student'
         AND (is_active = 1 OR is_active IS NULL)
         AND LOWER(LTRIM(RTRIM(department))) = LOWER(LTRIM(RTRIM(@department)))`,
      { department: department.trim() }
    );
  } else {
    result = await query(
      `SELECT id, name, email, department, level FROM Users
       WHERE role = 'student' AND (is_active = 1 OR is_active IS NULL)`
    );
  }

  const { matchesLevel } = require('../utils/academic');
  return result.recordset.filter(student => matchesLevel(student.level, targetLevel));
}

async function findStudentsByDepartment(department, levelScope) {
  const paginated = await findStudentsByDepartmentPaginated(department, levelScope, {});
  return paginated.items;
}

async function findStudentsByDepartmentPaginated(department, levelScope, { limit, offset, search } = {}) {
  const hasPagination = Number.isInteger(limit) || Number.isInteger(offset) || (typeof search === 'string' && search.length > 0);
  const limitVal = hasPagination ? Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200) : null;
  const offsetVal = hasPagination ? Math.max(parseInt(offset, 10) || 0, 0) : null;
  const searchTerm = typeof search === 'string' ? search.trim() : '';
  const params = {};
  let whereDept = '';
  if (department && department.trim()) {
    whereDept = 'AND LOWER(LTRIM(RTRIM(department))) = LOWER(LTRIM(RTRIM(@department)))';
    params.department = department.trim();
  }
  let whereSearch = '';
  if (searchTerm) {
    whereSearch = 'AND (name LIKE @search OR email LIKE @search)';
    params.search = `%${searchTerm}%`;
  }
  const whereBase = `WHERE role = 'student' AND (is_active = 1 OR is_active IS NULL) ${whereDept} ${whereSearch}`;
  if (!hasPagination) {
    const result = await query(
      `SELECT id, name, email, department, level, programme, student_id, phone, created_at FROM Users ${whereBase} ORDER BY name ASC, id ASC`,
      params
    );
    let items = result.recordset;
    if (levelScope) {
      const { isTargetLevelAllowed } = require('../utils/academic');
      items = items.filter(student => isTargetLevelAllowed(levelScope, student.level));
    }
    return { items, total: items.length, limit: items.length, offset: 0 };
  }
  const countResult = await query(`SELECT COUNT(*) AS count FROM Users ${whereBase}`, params);
  params.limit = limitVal;
  params.offset = offsetVal;
  const result = await query(
    `SELECT id, name, email, department, level, programme, student_id, phone, created_at FROM Users ${whereBase} ORDER BY name ASC, id ASC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
    params
  );
  let items = result.recordset;
  if (levelScope) {
    const { isTargetLevelAllowed } = require('../utils/academic');
    items = items.filter(student => isTargetLevelAllowed(levelScope, student.level));
  }
  return { items, total: Number(countResult.recordset[0].count), limit: limitVal, offset: offsetVal };
}

module.exports = {
  buildUserFindByIdQuery,
  isMissingColumnError,
  findByEmail,
  findByUsername,
  findByEmailOrUsername,
  findById,
  createUser,
  findByVerificationToken,
  verifyUser,
  setVerificationToken,
  findAll,
  findAllPaginated,
  updateRole,
  setActiveStatus,
  getStats,
  findAllStudents,
  findStudentsByIds,
  findByIdWithEmail,
  updatePassword,
  updateProfile,
  findStudentsForAssignment,
  findStudentsByDepartment,
  findStudentsByDepartmentPaginated,
};
