const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const fs = require('fs');
const path = require('path');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'asms-storage-'));
process.env.UPLOAD_PATH = path.join(tmpDir, 'uploads');

const storage = require('../services/storage');

test.after(async () => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  try {
    const { getPool } = require('../config/db');
    const pool = await getPool();
    if (pool) {
      if (pool.close) await pool.close();
      if (pool.end) await pool.end();
    }
  } catch { /* ignore cleanup error */ }
});

test('toKey normalizes windows separators and strips the uploads prefix', () => {
  assert.equal(storage.toKey('uploads/assignments/1/a.pdf'), 'assignments/1/a.pdf');
  assert.equal(storage.toKey('uploads\\assignments\\1\\a.pdf'), 'assignments/1/a.pdf');
  assert.equal(storage.toKey('assignments/1/a.pdf'), 'assignments/1/a.pdf');
  assert.equal(storage.toKey(''), '');
});

test('disk storage round-trips a file', async () => {
  const fp = 'uploads/assignments/42/report.pdf';
  await storage.storeFile({ filePath: fp, buffer: Buffer.from('hello'), contentType: 'application/pdf' });

  assert.equal(await storage.exists(fp), true);
  assert.equal(await storage.exists(fp, true), 5);

  const stream = await storage.createReadStream(fp);
  const readBack = await new Promise((resolve, reject) => {
    let data = '';
    stream.on('data', (c) => { data += c.toString(); });
    stream.on('end', () => resolve(data));
    stream.on('error', reject);
  });
  assert.equal(readBack, 'hello');

  await storage.unlink(fp);
  assert.equal(await storage.exists(fp), false);
});

test('missing files report null/false instead of throwing', async () => {
  const fp = 'uploads/assignments/9/missing.pdf';
  assert.equal(await storage.exists(fp), false);
  assert.equal(await storage.exists(fp, true), null);
  assert.equal(await storage.createReadStream(fp), null);
  await storage.unlink(fp); // must not throw
});