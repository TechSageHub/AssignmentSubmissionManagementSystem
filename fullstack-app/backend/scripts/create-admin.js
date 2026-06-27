// Bootstrap / reset the first real admin account.
//
// The seeded admin from migration_002 has a placeholder password hash and cannot log in.
// Run this once after deploy to create (or reset) a usable admin:
//
//   ADMIN_NAME="System Admin" ADMIN_EMAIL=admin@fpi.edu.ng ADMIN_PASSWORD=changeme123 npm run create-admin
//
// On Windows PowerShell:
//   $env:ADMIN_EMAIL="admin@fpi.edu.ng"; $env:ADMIN_PASSWORD="changeme123"; npm run create-admin
//
// If the email already exists, its password is reset and the account is promoted to a
// verified, active admin. The admin is NOT forced to change password (you chose it here).

const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const userModel = require('../models/user');

async function run() {
  const name = process.env.ADMIN_NAME || 'System Admin';
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required.');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('ADMIN_PASSWORD must be at least 8 characters.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const existing = await userModel.findByEmail(email);
    if (existing) {
      await query(
        `UPDATE Users
         SET password_hash = @passwordHash, role = 'admin', is_verified = 1, is_active = 1,
             must_change_password = 0, verification_token = NULL, verification_token_expires = NULL
         WHERE email = @email`,
        { passwordHash, email }
      );
      console.log(`Reset existing account "${email}" to a verified, active admin.`);
    } else {
      await query(
        `INSERT INTO Users (name, email, password_hash, role, username, is_verified, is_active, must_change_password)
         VALUES (@name, @email, @passwordHash, 'admin', @username, 1, 1, 0)`,
        { name, email, passwordHash, username: email.split('@')[0] }
      );
      console.log(`Created new admin account "${email}".`);
    }
    console.log('Done. You can now log in with the provided email and password.');
    process.exit(0);
  } catch (err) {
    console.error('Failed to create admin:', err.message);
    process.exit(1);
  }
}

run();
