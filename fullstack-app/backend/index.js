const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const http = require('http');
const config = require('./config/env');
const reminderService = require('./services/reminderService');
const systemConfigModel = require('./models/systemConfig');

// CORS: allow the configured frontend origins plus common dev ports. When no
// origins are configured (fresh local dev), fall back to permissive, matching
// the previous behaviour. Set CORS_ORIGINS (comma-separated) in production.
function buildCorsOptions() {
  const configured = (process.env.CORS_ORIGINS || '')
    .split(',').map((s) => s.trim()).filter(Boolean);
  const implicit = [
    process.env.FRONTEND_URL,
    process.env.NGROK_URL,
    'http://localhost:5173',
    'http://localhost:4173',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:4173',
  ].filter(Boolean);
  const origins = [...new Set([...configured, ...implicit])];

  if (origins.length === 0) {
    console.warn('[cors] CORS_ORIGINS not configured; allowing all origins');
    return null;
  }

  return {
    origin(origin, cb) {
      // Allow requests with no Origin header (curl, native clients).
      if (!origin) return cb(null, true);
      return cb(null, origins.includes(origin));
    },
  };
}

const app = express();

if (process.env.RATE_LIMIT_TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
const corsOptions = buildCorsOptions();
app.use(corsOptions ? cors(corsOptions) : cors());
app.use(express.json());

// Uploaded files are NEVER served statically. They are only streamed through the
// authorized endpoint /api/submissions/:submissionId/file (see submissionController).
app.use('/uploads', (_req, res) => {
  res.status(404).json({ error: 'NotFoundError', details: 'Use the authenticated file endpoint' });
});

const { globalLimiter } = require('./middleware/rateLimit');
app.use('/api', globalLimiter);

const authRoutes = require('./routes/auth');
const assignmentRoutes = require('./routes/assignments');
const submissionRoutes = require('./routes/submissions');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/users');
const notificationRoutes = require('./routes/notifications');

app.use('/api/auth', authRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);

// Public config endpoint (used by frontend for branding and ngrok URL)
app.get('/api/config', async (_req, res, next) => {
  try {
    const publicConfig = await systemConfigModel.getAll();
    res.json({
      ...publicConfig,
      ngrokUrl: process.env.NGROK_URL || null,
    });
  } catch (err) {
    next(err);
  }
});

// Serve frontend in production
const frontendDist = path.resolve(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendDist));
app.use((_req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// Global error handler
app.use((err, req, res, _next) => {
  console.error(err);

  const status = Number.isInteger(err && err.status) && err.status >= 400 && err.status < 600
    ? err.status
    : 500;
  const exposeDetails = status < 500 || process.env.NODE_ENV !== 'production';
  const message = exposeDetails
    ? String((err && err.message) || 'An unexpected error occurred').slice(0, 500)
    : 'An unexpected error occurred. Please try again later.';

  res.status(status).json({
    error: String((err && err.name) || 'InternalServerError').slice(0, 100),
    details: message,
  });
});

// Only start the server when run directly (not when imported by Vercel)
if (require.main === module) {
  if (process.env.VERCEL !== '1') {
    reminderService.start();
  }

  // Detect ngrok URL from local API (runs alongside ngrok CLI)
  async function detectNgrokUrl() {
    return new Promise((resolve) => {
      http.get('http://127.0.0.1:4040/api/tunnels', (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const tunnels = JSON.parse(data).tunnels;
            const httpsTunnel = tunnels.find((t) => t.public_url?.startsWith('https'));
            resolve(httpsTunnel?.public_url || null);
          } catch {
            resolve(null);
          }
        });
      }).on('error', () => resolve(null));
    });
  }

  app.listen(config.port, async () => {
    console.log(`Server running on port ${config.port}`);

    if (process.env.NGROK_URL) {
      console.log(`Public URL: ${process.env.NGROK_URL}`);
    } else {
      const url = await detectNgrokUrl();
      if (url) {
        process.env.NGROK_URL = url;
        console.log(`Public URL: ${url}`);
      }
    }
  });
}

module.exports = app;
