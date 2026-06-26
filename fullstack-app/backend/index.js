const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const http = require('http');
const config = require('./config/env');
const reminderService = require('./services/reminderService');
const systemConfigModel = require('./models/systemConfig');

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.resolve(__dirname, config.uploadPath)));

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
  const status = err.status || 500;
  res.status(status).json({
    error: err.name || 'InternalServerError',
    details: err.message || 'An unexpected error occurred',
  });
});

reminderService.start();

// Detect ngrok URL from local API (runs alongside ngrok CLI)
function detectNgrokUrl() {
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
    console.log(`🌍 Public URL: ${process.env.NGROK_URL}`);
  } else {
    const url = await detectNgrokUrl();
    if (url) {
      process.env.NGROK_URL = url;
      console.log(`🌍 Public URL: ${url}`);
    }
  }
});
