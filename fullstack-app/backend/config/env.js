const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const dbType = process.env.DB_TYPE || 'mssql';

if (dbType === 'postgres') {
  const required = ['DB_DATABASE', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET', 'EMAIL_FROM', 'EMAIL_PASSWORD', 'EMAIL_HOST'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
} else {
  const required = ['DB_SERVER', 'DB_DATABASE', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET', 'EMAIL_FROM', 'EMAIL_PASSWORD', 'EMAIL_HOST'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

const db = dbType === 'postgres'
  ? {
      host: process.env.DB_HOST || process.env.DB_SERVER || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      database: process.env.DB_DATABASE,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    }
  : {
      server: process.env.DB_SERVER,
      port: parseInt(process.env.DB_PORT, 10) || 1433,
      database: process.env.DB_DATABASE,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: true,
      },
    };

module.exports = {
  port: parseInt(process.env.PORT, 10) || 5000,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  db,
  email: {
    from: process.env.EMAIL_FROM,
    password: process.env.EMAIL_PASSWORD,
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
  },
  jwtSecret: process.env.JWT_SECRET,
  uploadPath: process.env.UPLOAD_PATH || 'uploads',
};
