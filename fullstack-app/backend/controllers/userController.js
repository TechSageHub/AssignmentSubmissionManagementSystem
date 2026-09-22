const bcrypt = require('bcryptjs');
const config = require('../config/env');
const userModel = require('../models/user');
const { sendEmail } = require('../config/email');
const { escapeHtml } = require('../utils/html');
const { generateTemporaryPassword } = require('../utils/password');
const auditLog = require('../utils/auditLogger');

const ALLOWED_ROLES = ['student', 'lecturer', 'admin'];

// Shared provisioning logic used by the single-create endpoint and CSV import.
// `creator` enforces authorization (lecturers may only create students) and
// automatically scopes the new student's department to the lecturer's own
// department. Accepts either a role string (legacy) or the full req.user object.
// Returns the created user record. Throws { status, details } on validation failure.
async function provisionUser({ name, email, password, role, username, studentId, staffId, department, programme, level, phone, levelScope, level_scope }, creator) {
  const creatorRole = typeof creator === 'string' ? creator : creator?.role;
  const creatorDept = typeof creator === 'object' && creator?.department ? String(creator.department).trim() : null;
  if (!name || !email || !role) {
    throw { status: 400, details: 'Name, email and role are required' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw { status: 400, details: 'Invalid email format' };
  }
  if (password && password.length < 8) {
    throw { status: 400, details: 'Password must be at least 8 characters' };
  }
  // Passwords are auto-generated unless one is explicitly supplied (backwards
  // compatible with CSV files that still carry a password column).
  const temporaryPassword = password || generateTemporaryPassword();
  if (!ALLOWED_ROLES.includes(role)) {
    throw { status: 400, details: 'Role must be student, lecturer, or admin' };
  }
  if (creatorRole === 'lecturer' && role !== 'student') {
    throw { status: 403, details: 'Lecturers can only create student accounts' };
  }
  // Lecturers automatically create students in their own department (AGENTS.md: lecturer scope).
  if (creatorRole === 'lecturer' && creatorDept) {
    department = creatorDept;
  }

  const existing = await userModel.findByEmail(email);
  if (existing) {
    throw { status: 409, details: 'Email already in use' };
  }
  if (username) {
    const existingUsername = await userModel.findByUsername(username);
    if (existingUsername) {
      throw { status: 409, details: 'Username already taken' };
    }
  }

  const passwordHash = await bcrypt.hash(temporaryPassword, 10);
  const user = await userModel.createUser({
    name, email, passwordHash, role, username,
    studentId: role === 'student' ? studentId : null,
    staffId: role === 'lecturer' ? staffId : null,
    department, programme, level, phone,
    levelScope: role === 'lecturer' ? (levelScope || level_scope || null) : null,
    mustChangePassword: true,
  });

  // Send verification email — the account is created unverified and cannot log in until verified.
  const baseUrl = process.env.NGROK_URL || config.frontendUrl;
  const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${user.verification_token}`;
  try {
    await sendEmail({
      to: email,
      subject: 'Verify your account',
      text: `Hi ${name},

An account has been created for you on the FPI Assignment Submission System.

Temporary Password: ${temporaryPassword}

Please verify your email by visiting this link: ${verifyUrl}
This link expires in 24 hours.

After verification, you will be asked to set your own password on first login.
`,
      html: `<p>Hi ${escapeHtml(name)},</p>
        <p>An account has been created for you on the FPI Assignment Submission System.</p>
        <p><strong>Temporary password:</strong> ${escapeHtml(temporaryPassword)}</p>
        <p>Click <a href="${verifyUrl}">here</a> to verify your email. This link expires in 24 hours.</p>
        <p>After verification, you will be asked to set your own password on first login.</p>`,
    });
  } catch (emailErr) {
    console.error('Failed to send verification email:', emailErr.message);
  }

  return user;
}

async function getStudents(req, res, next) {
  try {
    const hasPagination = req.query.limit !== undefined || req.query.offset !== undefined || req.query.search !== undefined;
    if (hasPagination) {
      const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
      const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
      const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
      if (req.user.role === 'lecturer' && req.user.department) {
        const paginated = await userModel.findStudentsByDepartmentPaginated(req.user.department, req.user.level_scope, { limit, offset, search });
        return res.json({ items: paginated.items, total: paginated.total, limit, offset });
      }
      // Fallback: paginate findAllStudents via filtered query (admin view)
      const paginated = await userModel.findStudentsByDepartmentPaginated(null, null, { limit, offset, search });
      return res.json({ items: paginated.items, total: paginated.total, limit, offset });
    }
    if (req.user.role === 'lecturer' && req.user.department) {
      const students = await userModel.findStudentsByDepartment(req.user.department, req.user.level_scope);
      return res.json(students);
    }
    const students = await userModel.findAllStudents();
    res.json(students);
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const { department, programme, level, phone, levelScope, level_scope } = req.body;
    const user = await userModel.updateProfile(req.user.id, {
      department,
      programme,
      level,
      phone,
      levelScope: levelScope || level_scope || null,
    });
    if (!user) {
      return res.status(404).json({ error: 'NotFoundError', details: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    next(err);
  }
}

// POST /users — admin or lecturer creates a single account.
async function createUser(req, res, next) {
  try {
    const user = await provisionUser(req.body, req.user);
    auditLog.log(req, 'create_user', 'user', user.id, { role: req.body.role, email: req.body.email });
    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      message: 'Account created. A verification email has been sent to the user.',
    });
  } catch (err) {
    if (err && err.status) {
      return res.status(err.status).json({ error: 'ValidationError', details: err.details });
    }
    next(err);
  }
}

module.exports = { getStudents, updateProfile, createUser, provisionUser };
