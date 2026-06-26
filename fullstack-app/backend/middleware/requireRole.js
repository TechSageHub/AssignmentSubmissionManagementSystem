function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'AuthenticationError', details: 'Not authenticated' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'AuthorizationError', details: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = { requireRole };
