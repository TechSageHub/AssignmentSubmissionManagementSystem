const bcrypt = require('bcryptjs');
const config = require('../config/env');
const userModel = require('../models/user');
const { sendEmail } = require('../config/email');
const auditLog = require('../utils/auditLogger');

const ALLOWED_ROLES = ['student', 'lecturer', 'admin'];

// Shared provisioning logic used by the single-create endpoint and CSV import.
// `creatorRole` enforces authorization (lecturers may only create students).
// Returns the created user record. Throws { status, details } on validation failure.
async function provisionUser({ name, email, password, role, username, studentId, staffId, department, programme, level, phone }, creatorRole) {
  if (!name || !email || !password || !role) {
    throw { status: 400, details: 'Name, email, password and role are required' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw { status: 400, details: 'Invalid email format' };
  }
  if (password.length < 8) {
    throw { status: 400, details: 'Password must be at least 8 characters' };
  }
  if (!ALLOWED_ROLES.includes(role)) {
    throw { status: 400, details: 'Role must be student, lecturer, or admin' };
  }
  if (creatorRole === 'lecturer' && role !== 'student') {
    throw { status: 403, details: 'Lecturers can only create student accounts' };
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

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await userModel.createUser({
    name, email, passwordHash, role, username,
    studentId: role === 'student' ? studentId : null,
    staffId: role === 'lecturer' ? staffId : null,
    department, programme, level, phone,
    mustChangePassword: true,
  });

  // Send verification email — the account is created unverified and cannot log in until verified.
  const baseUrl = process.env.NGROK_URL || config.frontendUrl;
  const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${user.verification_token}`;
  try {
    await sendEmail({
      to: email,
      subject: 'Verify your account',
      html: `<p>Hi ${name},</p>
        <p>An account has been created for you on the FPI Assignment Submission System.</p>
        <p>Click <a href="${verifyUrl}">here</a> to verify your email. This link expires in 24 hours.</p>
        <p>You will be asked to set your own password the first time you log in.</p>`,
    });
  } catch (emailErr) {
    console.error('Failed to send verification email:', emailErr.message);
  }

  return user;
}

async function getStudents(req, res, next) {
  try {
    const students = await userModel.findAllStudents();
    res.json(students);
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const { department, programme, level, phone } = req.body;
    const user = await userModel.updateProfile(req.user.id, { department, programme, level, phone });
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
    const user = await provisionUser(req.body, req.user.role);
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
