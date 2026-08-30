const fs = require('fs');
const path = require('path');
const { query, getPool } = require('../config/db');

const dbType = process.env.DB_TYPE || 'mssql';
const databaseDir = path.resolve(__dirname, '..', '..', 'database');
const schemaFile = dbType === 'postgres'
  ? path.join(databaseDir, 'schema.postgres.sql')
  : path.join(databaseDir, 'schema.sql');

// Migrations 001-007 are T-SQL only; the postgres schema file is the single
// source of truth for those changes. Only postgres-native migrations run here.
const migrations = dbType === 'postgres'
  ? [
      'migration_008_add_submission_files.postgres.sql',
      'migration_009_add_reminder_log.postgres.sql',
      'migration_010_add_gradecriteria_unique.postgres.sql',
      'migration_011_submissions_unique_fk.postgres.sql',
    ]
  : [
      'migration_001_add_verification.sql',
      'migration_002_add_admin_role.sql',
      'migration_003_add_rubrics.sql',
      'migration_004_add_group_submissions.sql',
      'migration_005_add_audit_log.sql',
      'migration_006_add_owner_requirements.sql',
      'migration_007_add_must_change_password.sql',
      'migration_008_add_submission_files.sql',
      'migration_009_add_reminder_log.sql',
      'migration_010_add_gradecriteria_unique.sql',
      'migration_011_submissions_unique_fk.sql',
    ];

function splitStatements(sql) {
  if (dbType === 'postgres') {
    // Strip full-line comments first so a statement that follows a "-- " comment
    // (e.g. the SystemConfig seed block) is not dropped, then split on ";".
    return sql
      .split('\n')
      .filter((line) => !/^\s*--/.test(line))
      .join('\n')
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 3 && !/^(GO|USE)\b/i.test(s));
  }
  return sql
    .split(/\nGO\b/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function ensureJournal() {
  if (dbType === 'postgres') {
    await query(`CREATE TABLE IF NOT EXISTS SchemaMigrations (
      name VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT NOW()
    )`);
  } else {
    await query(`IF OBJECT_ID('dbo.SchemaMigrations', 'U') IS NULL
      CREATE TABLE SchemaMigrations (
        name NVARCHAR(255) PRIMARY KEY,
        applied_at DATETIME2 DEFAULT GETDATE()
      )`);
  }
}

async function getAppliedMigrations() {
  const result = await query('SELECT name FROM SchemaMigrations');
  const rows = result.recordset || result.rows || [];
  return new Set(rows.map((r) => r.name));
}

async function runStatements(sql, label, described) {
  const statements = splitStatements(sql);
  const errors = [];
  for (const stmt of statements) {
    try {
      await query(stmt);
    } catch (err) {
      errors.push(err.message);
    }
  }
  if (errors.length > 0) {
    console.error(`  Failed ${errors.length}/${statements.length} statement(s)`);
    for (const msg of errors) console.error(`    - ${msg}`);
    throw new Error(`migration step failed: ${label}${described ? ` (${described})` : ''}`);
  }
}

async function run() {
  try {
    await getPool();
    await ensureJournal();

    // Schema is authoritative and fully guarded/idempotent (both dialects),
    // so it is applied on every run. Any failure here is fatal.
    if (!fs.existsSync(schemaFile)) {
      console.error(`Schema file not found: ${schemaFile}`);
      process.exit(1);
    }
    const schemaSql = fs.readFileSync(schemaFile, 'utf-8');
    console.log(`Running schema: ${schemaFile}...`);
    await runStatements(schemaSql, schemaFile);
    console.log('  Schema done.');

    const applied = await getAppliedMigrations();

    for (const file of migrations) {
      const filePath = path.join(databaseDir, file);
      if (!fs.existsSync(filePath)) {
        console.error(`Migration not found: ${file}`);
        process.exit(1);
      }
      if (applied.has(file)) {
        console.log(`Skipping ${file} (already applied)`);
        continue;
      }
      const sql = fs.readFileSync(filePath, 'utf-8');
      console.log(`Running ${file}...`);
      await runStatements(sql, file);
      await query('INSERT INTO SchemaMigrations (name) VALUES (@name)', { name: file });
      console.log('  Done.');
    }

    console.log('\nAll migrations completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('MIGRATION FAILED:', err.message);
    process.exit(1);
  }
}

run();