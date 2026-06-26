const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const userModel = require('../models/user');
const { sendEmail } = require('../config/email');
const auditLog = require('../utils/auditLogger');

async function register(req, res, next) {
  try {
    const { name, email, password, role, username, studentId, staffId, department, programme, level, phone } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'ValidationError', details: 'All fields are required' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'ValidationError', details: 'Invalid email format' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'ValidationError', details: 'Password must be at least 8 characters' });
    }
    if (!['student', 'lecturer'].includes(role)) {
      return res.status(400).json({ error: 'ValidationError', details: 'Role must be student or lecturer' });
    }

    const existing = await userModel.findByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'ValidationError', details: 'Email already in use' });
    }
    if (username) {
      const existingUsername = await userModel.findByUsername(username);
      if (existingUsername) {
        return res.status(409).json({ error: 'ValidationError', details: 'Username already taken' });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await userModel.createUser({
      name, email, passwordHash, role, username,
      studentId: role === 'student' ? studentId : null,
      staffId: role === 'lecturer' ? staffId : null,
      department, programme, level, phone,
    });

    const baseUrl = process.env.NGROK_URL || config.frontendUrl;
    const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${user.verification_token}`;
    try {
      await sendEmail({
        to: email,
        subject: 'Verify your email',
        html: `<p>Hi ${name},</p><p>Click <a href="${verifyUrl}">here</a> to verify your email. This link expires in 24 hours.</p>`,
      });
    } catch (emailErr) {
      console.error('Failed to send verification email:', emailErr.message);
    }

    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      message: 'Registration successful. Please check your email to verify your account.',
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'ValidationError', details: 'Email/Username and password are required' });
    }

    const user = await userModel.findByEmailOrUsername(email);
    if (!user) {
      return res.status(401).json({ error: 'AuthenticationError', details: 'Invalid credentials' });
    }

    if (!user.is_verified) {
      return res.status(403).json({ error: 'EmailNotVerified', details: 'Please verify your email before logging in' });
    }

    if (user.is_active === 0 || user.is_active === false) {
      return res.status(403).json({ error: 'AccountSuspended', details: 'Your account has been suspended. Contact an administrator.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'AuthenticationError', details: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id }, config.jwtSecret, { expiresIn: '24h' });

    auditLog.log(req, 'login', 'user', user.id, { email });

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      token,
    });
  } catch (err) {
    next(err);
  }
}

async function verifyEmail(req, res, next) {
  try {
    const { token } = req.query;
    const publicUrl = process.env.NGROK_URL || config.frontendUrl;
    if (!token) {
      return res.redirect(`${publicUrl}/login?verified=error`);
    }

    const user = await userModel.findByVerificationToken(token);
    if (!user) {
      return res.redirect(`${publicUrl}/login?verified=error`);
    }

    await userModel.verifyUser(user.id);
    res.redirect(`${publicUrl}/login?verified=true`);
  } catch (err) {
    next(err);
  }
}

async function resendVerification(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'ValidationError', details: 'Email is required' });
    }

    const user = await userModel.findByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'NotFound', details: 'User not found' });
    }
    if (user.is_verified) {
      return res.status(400).json({ error: 'AlreadyVerified', details: 'Email is already verified' });
    }

    const token = await userModel.setVerificationToken(email);
    const baseUrl = process.env.NGROK_URL || config.frontendUrl;
    const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${token}`;
    try {
      await sendEmail({
        to: email,
        subject: 'Verify your email',
        html: `<p>Hi ${user.name},</p><p>Click <a href="${verifyUrl}">here</a> to verify your email. This link expires in 24 hours.</p>`,
      });
    } catch (emailErr) {
      console.error('Failed to send verification email:', emailErr.message);
    }

    res.json({ message: 'Verification email sent. Please check your inbox.' });
  } catch (err) {
    next(err);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'ValidationError', details: 'Email is required' });
    }

    const user = await userModel.findByEmail(email);
    if (!user) {
      return res.json({ message: 'If the email exists, a reset link has been sent.' });
    }

    const token = await userModel.setVerificationToken(email);
    const resetUrl = `${config.frontendUrl}/reset-password?token=${token}`;
    try {
      await sendEmail({
        to: email,
        subject: 'Reset your password',
        html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6366f1;">Password Reset</h2>
          <p>Hi ${user.name},</p>
          <p>Click the button below to reset your password. This link expires in 24 hours.</p>
          <p style="text-align: center; margin: 24px 0;">
            <a href="${resetUrl}" style="background: #6366f1; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">Reset Password</a>
          </p>
          <p style="color: #94a3b8; font-size: 12px;">If you didn't request this, ignore this email.</p>
        </div>`,
      });
    } catch (emailErr) {
      console.error('Failed to send reset email:', emailErr.message);
    }

    res.json({ message: 'If the email exists, a reset link has been sent.' });
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: 'ValidationError', details: 'Token and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'ValidationError', details: 'Password must be at least 8 characters' });
    }

    const user = await userModel.findByVerificationToken(token);
    if (!user) {
      return res.status(400).json({ error: 'InvalidToken', details: 'Invalid or expired reset token' });
    }

    await userModel.updatePassword(user.id, password);
    res.json({ message: 'Password reset successfully. You can now log in with your new password.' });
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res) {
  res.json(req.user);
}

module.exports = { register, login, verifyEmail, resendVerification, forgotPassword, resetPassword, getMe };
