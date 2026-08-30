const { rateLimit } = require('express-rate-limit');

// Set RATE_LIMIT_ENABLED=false to disable all rate limiting (dev/firewall scripts).
// Set RATE_LIMIT_TRUST_PROXY=true when running behind a reverse proxy (Render/Vercel)
// so req.ip reflects the real client instead of the proxy's address.
const enabled = process.env.RATE_LIMIT_ENABLED !== 'false';

const message = {
  error: 'RateLimitError',
  details: 'Too many requests. Please try again later.',
};

function createLimiter({ limit, windowMs = 15 * 60 * 1000, keyGenerator }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message,
    skip: () => !enabled,
    ...(keyGenerator ? { keyGenerator } : {}),
  });
}

// Broad cap across all /api traffic (per IP).
const globalLimiter = createLimiter({ limit: 600 });

// Tight cap on unauthenticated auth attempts (login, resend, forgot/reset password).
// One shared counter, so brute-force on any of these is throttled together.
const authLimiter = createLimiter({ limit: 10 });

// Email link endpoints (verify-email) must tolerate manual re-clicks.
const emailLinkLimiter = createLimiter({ limit: 30 });

// File uploads (assignment submission).
const uploadLimiter = createLimiter({ limit: 30 });

module.exports = { createLimiter, globalLimiter, authLimiter, emailLinkLimiter, uploadLimiter };