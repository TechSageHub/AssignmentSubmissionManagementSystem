const { query } = require('../config/db');

function isMissingTableError(err) {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  return /invalid object name.*storageblobs/i.test(msg) || /relation.*storageblobs.*does not exist/i.test(msg);
}

async function upsert(key, buffer, contentType = null) {
  if (!key || !buffer) return;
  const fileSize = Buffer.isBuffer(buffer) ? buffer.length : Buffer.from(buffer).length;
  const data = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);

  try {
    const existing = await query('SELECT [key] FROM StorageBlobs WHERE [key] = @key', { key });
    if (existing.recordset && existing.recordset.length > 0) {
      await query(
        'UPDATE StorageBlobs SET [content_type] = @contentType, [file_size] = @fileSize, [data] = @data WHERE [key] = @key',
        { key, contentType, fileSize, data }
      );
    } else {
      await query(
        'INSERT INTO StorageBlobs ([key], [content_type], [file_size], [data]) VALUES (@key, @contentType, @fileSize, @data)',
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
  try {
    const result = await query(
      'SELECT [key], [content_type], [file_size], [data], [created_at] FROM StorageBlobs WHERE [key] = @key',
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
  try {
    const result = await query(
      'SELECT [file_size] FROM StorageBlobs WHERE [key] = @key',
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
  try {
    await query('DELETE FROM StorageBlobs WHERE [key] = @key', { key });
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
};
