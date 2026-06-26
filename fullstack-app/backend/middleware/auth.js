const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { findById } = require('../models/user');

async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'AuthenticationError', details: 'No token provided' });
  }

  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'AuthenticationError', details: 'User not found' });
    }
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'AuthenticationError', details: 'Invalid or expired token' });
    }
    next(err);
  }
}

module.exports = { authenticate };
