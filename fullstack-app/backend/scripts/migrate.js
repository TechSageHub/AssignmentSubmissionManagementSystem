const fs = require('fs');
const path = require('path');
const { query } = require('../config/db');

const dbType = process.env.DB_TYPE || 'mssql';
const databaseDir = path.resolve(__dirname, '..', '..', 'database');
const schemaFile = dbType === 'postgres'
  ? path.join(databaseDir, 'schema.postgres.sql')
  : path.join(databaseDir, 'schema.sql');

const migrations = [
  'migration_001_add_verification.sql',
  'migration_002_add_admin_role.sql',
  'migration_003_add_rubrics.sql',
  'migration_004_add_group_submissions.sql',
  'migration_005_add_audit_log.sql',
  'migration_006_add_owner_requirements.sql',
];

async function runSchema() {
  if (!fs.existsSync(schemaFile)) {
    console.log(`Schema file not found: ${schemaFile}`);
    return;
  }
  const sql = fs.readFileSync(schemaFile, 'utf-8');
  console.log(`Running schema: ${schemaFile}...`);

  if (dbType === 'postgres') {
    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0 && !/^--/.test(s));
    for (const stmt of statements) {
      if (stmt.length > 3) { try { await query(stmt); } catch (err) { console.error(`  Error: ${err.message}`); } }
    }
  } else {
    const batches = sql.split(/\nGO\b/i);
    for (const batch of batches) {
      const trimmed = batch.trim();
      if (trimmed) {
        try { await query(trimmed); } catch (err) { console.error(`  Error: ${err.message}`); }
      }
    }
  }
  console.log('  Schema done.');
}

async function runMigrations() {
  for (const file of migrations) {
    const filePath = path.join(databaseDir, file);
    if (!fs.existsSync(filePath)) {
      console.log(`Skipping ${file} (not found)`);
      continue;
    }
    const sql = fs.readFileSync(filePath, 'utf-8');
    console.log(`Running ${file}...`);

    if (dbType === 'postgres') {
      const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0 && !/^(GO|USE)\b/i.test(s));
      for (const stmt of statements) {
        if (stmt.length > 3) { try { await query(stmt); } catch (err) { console.error(`  Error: ${err.message}`); } }
      }
    } else {
      const batches = sql.split(/\nGO\b/i);
      for (const batch of batches) {
        const trimmed = batch.trim();
        if (trimmed) {
          try { await query(trimmed); } catch (err) { console.error(`  Error: ${err.message}`); }
        }
      }
    }
    console.log('  Done.');
  }
}

async function run() {
  try {
    await runSchema();
    await runMigrations();
    console.log('\nAll migrations completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

run();
