const { query } = require('../config/db');

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
  const result = await query(
    `SELECT id, name, email, username, role, is_verified, is_active, is_verified,
            student_id, staff_id, department, programme, level, phone, must_change_password, created_at
     FROM Users WHERE id = @id`,
    { id }
  );
  return result.recordset[0] || null;
}

const crypto = require('crypto');

function generateUsername(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.{2,}/g, '.').replace(/^\.|\.$/g, '');
}

async function createUser({ name, email, passwordHash, role, username, studentId, staffId, department, programme, level, phone, mustChangePassword = false }) {
  if (!username) {
    username = generateUsername(name);
    const existing = await findByUsername(username);
    if (existing) {
      username = username + Math.floor(1000 + Math.random() * 9000);
    }
  }
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const mustChange = mustChangePassword ? 1 : 0;
  const result = await query(
    `INSERT INTO Users (name, email, password_hash, role, username, student_id, staff_id, department, programme, level, phone, must_change_password, verification_token, verification_token_expires)
     OUTPUT INSERTED.id, INSERTED.name, INSERTED.email, INSERTED.role, INSERTED.username, INSERTED.created_at, INSERTED.verification_token
     VALUES (@name, @email, @passwordHash, @role, @username, @studentId, @staffId, @department, @programme, @level, @phone, @mustChange, @token, @expires)`,
    { name, email, passwordHash, role, username, studentId, staffId, department, programme, level, phone, mustChange, token, expires }
  );
  return result.recordset[0];
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

async function updateRole(id, role) {
  await query('UPDATE Users SET role = @role WHERE id = @id', { id, role });
}

async function setActiveStatus(id, isActive) {
  await query('UPDATE Users SET is_active = @isActive WHERE id = @id', { id, isActive });
}

async function getStats() {
  const users = await query("SELECT role, COUNT(*) as count FROM Users GROUP BY role");
  const assignments = await query("SELECT COUNT(*) as count FROM Assignments");
  const submissions = await query("SELECT COUNT(*) as count FROM Submissions");
  const grades = await query("SELECT COUNT(*) as count FROM Grades");
  return {
    users: users.recordset,
    totalAssignments: assignments.recordset[0].count,
    totalSubmissions: submissions.recordset[0].count,
    totalGrades: grades.recordset[0].count,
  };
}

async function findAllStudents() {
  const result = await query(
    "SELECT id, name, email FROM Users WHERE role = 'student' AND (is_active = 1 OR is_active IS NULL)"
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
  await query(
    'UPDATE Users SET password_hash = @hash, must_change_password = 0, verification_token = NULL, verification_token_expires = NULL WHERE id = @id',
    { hash, id }
  );
}

async function updateProfile(id, { department, programme, level, phone }) {
  const result = await query(
    `UPDATE Users SET department = @department, programme = @programme, level = @level, phone = @phone, updated_at = GETDATE()
     OUTPUT INSERTED.id, INSERTED.name, INSERTED.email, INSERTED.username, INSERTED.role,
            INSERTED.student_id, INSERTED.staff_id, INSERTED.department, INSERTED.programme, INSERTED.level, INSERTED.phone
     WHERE id = @id`,
    { id, department, programme, level, phone }
  );
  return result.recordset[0] || null;
}

module.exports = { findByEmail, findByUsername, findByEmailOrUsername, findById, createUser, findByVerificationToken, verifyUser, setVerificationToken, findAll, updateRole, setActiveStatus, getStats, findAllStudents, findByIdWithEmail, updatePassword, updateProfile };
