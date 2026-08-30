const { query } = require('../config/db');

const dbType = process.env.DB_TYPE || 'mssql';
let tableChecked = false;

async function ensureTable() {
  if (tableChecked) return;
  try {
    if (dbType === 'postgres') {
      await query(`CREATE TABLE IF NOT EXISTS "StorageBlobs" (
        "key" VARCHAR(500) PRIMARY KEY,
        "content_type" VARCHAR(255) NULL,
        "file_size" INT NOT NULL DEFAULT 0,
        "data" BYTEA NOT NULL,
        "created_at" TIMESTAMP DEFAULT NOW()
      )`);
    } else {
      await query(`IF OBJECT_ID('dbo.StorageBlobs', 'U') IS NULL
        BEGIN
          CREATE TABLE StorageBlobs (
            [key] VARCHAR(500) PRIMARY KEY,
            [content_type] VARCHAR(255) NULL,
            [file_size] INT NOT NULL DEFAULT 0,
            [data] VARBINARY(MAX) NOT NULL,
            [created_at] DATETIME2 DEFAULT GETDATE()
          );
        END`);
    }
    tableChecked = true;
  } catch (err) {
    console.error('Failed to ensure StorageBlobs table:', err.message);
  }
}

function isMissingTableError(err) {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  return /invalid object name.*storageblobs/i.test(msg) || /relation.*storageblobs.*does not exist/i.test(msg);
}

async function upsert(key, buffer, contentType = null) {
  if (!key || !buffer) return;
  await ensureTable();

  const fileSize = Buffer.isBuffer(buffer) ? buffer.length : Buffer.from(buffer).length;
  const data = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);

  try {
    const existing = await query('SELECT [key] FROM [StorageBlobs] WHERE [key] = @key', { key });
    if (existing.recordset && existing.recordset.length > 0) {
      await query(
        'UPDATE [StorageBlobs] SET [content_type] = @contentType, [file_size] = @fileSize, [data] = @data WHERE [key] = @key',
        { key, contentType, fileSize, data }
      );
    } else {
      await query(
        'INSERT INTO [StorageBlobs] ([key], [content_type], [file_size], [data]) VALUES (@key, @contentType, @fileSize, @data)',
        { key, contentType, fileSize, data }
      );
    }
  } catch (err) {
    if (isMissingTableError(err)) {
      console.warn('StorageBlobs table missing; DB blob storage skipped');
      return;
    }
    throw err;
  }
}

async function findByKey(key) {
  if (!key) return null;
  await ensureTable();

  try {
    const result = await query(
      'SELECT [key], [content_type], [file_size], [data], [created_at] FROM [StorageBlobs] WHERE [key] = @key',
      { key }
    );
    return (result.recordset && result.recordset[0]) || null;
  } catch (err) {
    if (isMissingTableError(err)) return null;
    throw err;
  }
}

async function exists(key) {
  if (!key) return null;
  await ensureTable();

  try {
    const result = await query(
      'SELECT [file_size] FROM [StorageBlobs] WHERE [key] = @key',
      { key }
    );
    if (!result.recordset || result.recordset.length === 0) return null;
    return Number(result.recordset[0].file_size) || 0;
  } catch (err) {
    if (isMissingTableError(err)) return null;
    throw err;
  }
}

async function removeByKey(key) {
  if (!key) return;
  await ensureTable();

  try {
    await query('DELETE FROM [StorageBlobs] WHERE [key] = @key', { key });
  } catch (err) {
    if (isMissingTableError(err)) return;
    throw err;
  }
}

module.exports = {
  upsert,
  findByKey,
  exists,
  removeByKey,
  isMissingTableError,
  ensureTable,
};
