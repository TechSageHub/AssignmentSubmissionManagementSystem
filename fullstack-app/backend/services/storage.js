// Upload storage abstraction.
// 1. If S3_BUCKET is configured: stores/retrieves files in S3-compatible object storage.
// 2. If S3_BUCKET is NOT configured: stores files in the database (StorageBlobs table)
//    and dual-writes to the local uploads directory when available. Reads transparently
//    fall back from disk to the database blob binary stream.
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const config = require('../config/env');
const storageBlobModel = require('../models/storageBlob');

const uploadDir = path.resolve(__dirname, '..', config.uploadPath);

// Normalize a stored file_path into an object key (always forward slashes,
// no "uploads/" prefix).
function toKey(filePath) {
  if (!filePath) return '';
  return String(filePath).replace(/\\/g, '/').replace(/^uploads\//, '');
}

function toDiskPath(filePath) {
  return path.resolve(uploadDir, toKey(filePath));
}

let s3Client = null;

function getS3Client() {
  if (s3Client) return s3Client;
  const { S3Client } = require('@aws-sdk/client-s3');
  const options = { region: process.env.S3_REGION || 'us-east-1' };
  const accessKeyId = process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
  if (accessKeyId && secretAccessKey) {
    options.credentials = { accessKeyId, secretAccessKey };
  }
  if (process.env.S3_ENDPOINT) {
    options.endpoint = process.env.S3_ENDPOINT;
    options.forcePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true';
  }
  s3Client = new S3Client(options);
  return s3Client;
}

function isS3Configured() {
  return Boolean(process.env.S3_BUCKET);
}

function getBucket() {
  return process.env.S3_BUCKET;
}

async function storeFile({ filePath, buffer, contentType }) {
  const key = toKey(filePath);
  if (!key || !buffer) {
    throw new Error('storage.storeFile requires a filePath and buffer');
  }

  if (isS3Configured()) {
    const { PutObjectCommand } = require('@aws-sdk/client-s3');
    await getS3Client().send(new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: buffer,
      ContentType: contentType || 'application/octet-stream',
    }));
    return;
  }

  // Local disk write (best-effort for local dev)
  try {
    const abs = toDiskPath(filePath);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, buffer);
  } catch { /* ignore ephemeral disk write errors on serverless */ }

  // Database binary blob persistence (zero-credential fallback for serverless/Vercel)
  await storageBlobModel.upsert(key, buffer, contentType);
}

// Returns true when the object exists; returns a number size when the caller
// asks for it (disk stat / DB file_size / S3 HeadObject).
async function exists(filePath, withSize = false) {
  const key = toKey(filePath);
  if (!key) return withSize ? null : false;

  if (isS3Configured()) {
    const { HeadObjectCommand } = require('@aws-sdk/client-s3');
    try {
      const head = await getS3Client().send(new HeadObjectCommand({ Bucket: getBucket(), Key: key }));
      const size = Number(head.ContentLength) || null;
      return withSize ? size : true;
    } catch (err) {
      const status = err && err.$metadata && err.$metadata.httpStatusCode;
      if (status === 404 || (err && err.name === 'NotFound')) return withSize ? null : false;
      throw err;
    }
  }

  const abs = toDiskPath(filePath);
  if (fs.existsSync(abs)) {
    return withSize ? fs.statSync(abs).size : true;
  }

  const dbSize = await storageBlobModel.exists(key);
  if (dbSize !== null) {
    return withSize ? dbSize : true;
  }

  return withSize ? null : false;
}

async function createReadStream(filePath) {
  const key = toKey(filePath);
  if (!key) return null;

  if (isS3Configured()) {
    const { GetObjectCommand } = require('@aws-sdk/client-s3');
    const response = await getS3Client().send(new GetObjectCommand({ Bucket: getBucket(), Key: key }));
    return response.Body || null;
  }

  const abs = toDiskPath(filePath);
  if (fs.existsSync(abs)) {
    return fs.createReadStream(abs);
  }

  const blob = await storageBlobModel.findByKey(key);
  if (blob && blob.data) {
    const buffer = Buffer.isBuffer(blob.data) ? blob.data : Buffer.from(blob.data);
    return Readable.from(buffer);
  }

  return null;
}

// Best-effort removal; never throws.
async function unlink(filePath) {
  const key = toKey(filePath);
  if (!key) return;

  try {
    if (isS3Configured()) {
      const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
      await getS3Client().send(new DeleteObjectCommand({ Bucket: getBucket(), Key: key }));
      return;
    }

    await storageBlobModel.removeByKey(key);

    const abs = toDiskPath(filePath);
    if (fs.existsSync(abs)) {
      fs.rmSync(abs, { force: true });
      try { fs.rmSync(path.dirname(abs), { recursive: true }); } catch { /* ignore */ }
    }
  } catch { /* ignore */ }
}

module.exports = { toKey, isS3Configured, storeFile, exists, createReadStream, unlink };