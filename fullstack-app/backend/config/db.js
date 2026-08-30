const mssql = require('mssql');
const { Pool } = require('pg');
const config = require('./env');

const dbType = process.env.DB_TYPE || 'mssql';

let pool = null;
let keepAliveTimer = null;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Only reconnect-and-retry on transport-level failures. Deterministic errors
// (unique violations, type errors) must NOT be retried — a blind retry can
// re-execute a committed INSERT and duplicate the write.
function isConnectionError(err) {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  if (!msg) return false;
  return /connection|timeout|econnrefused|econnreset|etimedout|socket hang up|pool destroyed|backend closed the connection|server closed the connection|client has encountered a connection error|sqlserver has gone away/i.test(msg);
}

function isDuplicateKeyError(err) {
  if (!err) return false;
  if (err.code === '23505') return true; // PostgreSQL unique violation
  if (err.number === 2627 || err.number === 2601) return true; // SQL Server unique / dup index
  const msg = (err.message || '') + ' ' + (err.originalError && err.originalError.message || '');
  return /duplicate key|unique constraint|violation of (unique key|primary key)|cannot insert duplicate/i.test(msg);
}

function startKeepAlive() {
  if (keepAliveTimer) clearInterval(keepAliveTimer);
  keepAliveTimer = setInterval(async () => {
    try {
      if (pool) {
        if (dbType === 'postgres') {
          await pool.query('SELECT 1');
        } else {
          await pool.request().query('SELECT 1');
        }
      }
    } catch {
      try { if (pool) await pool.end ? pool.end() : pool.close(); } catch { }
      pool = null;
    }
  }, 60000);
}

function getParamId(key, paramMap, paramIndex) {
  if (!paramMap[key]) paramMap[key] = ++paramIndex.value;
  return paramMap[key];
}

function convertPgSql(sql, params) {
  let s = sql;
  const keys = Object.keys(params);
  const paramIndex = { value: 0 };
  const paramMap = {};

  // First, handle OFFSET/FETCH while @params are still present
  s = s.replace(/\bOFFSET\s+@(\w+)\s+ROWS\s+FETCH\s+NEXT\s+@(\w+)\s+ROWS\s+ONLY\b/gi, (_, offset, next) => {
    const oIdx = getParamId(offset, paramMap, paramIndex);
    const nIdx = getParamId(next, paramMap, paramIndex);
    return `LIMIT $${nIdx} OFFSET $${oIdx}`;
  });
  s = s.replace(/\bOFFSET\s+(\d+)\s+ROWS\s+FETCH\s+NEXT\s+@(\w+)\s+ROWS\s+ONLY\b/gi, (_, offset, next) => {
    const nIdx = getParamId(next, paramMap, paramIndex);
    return `LIMIT $${nIdx} OFFSET ${offset}`;
  });

  // Then handle all other @params
  s = s.replace(/@(\w+)/g, (match, key) => {
    if (!keys.includes(key)) return match;
    const idx = getParamId(key, paramMap, paramIndex);
    return `$${idx}`;
  });

  const values = [];
  for (let i = 1; i <= paramIndex.value; i++) {
    const key = Object.keys(paramMap).find(k => paramMap[k] === i);
    values.push(params[key]);
  }

  s = s.replace(
    /(INSERT\s+INTO\s+\S+(?:\s*\([^)]*\))?)\s*OUTPUT\s+(INSERTED\.\*|(?:INSERTED\.\w+(?:\s*,\s*INSERTED\.\w+)*))\s+(VALUES\s*\(.*\))/gi,
    (_, insertPart, outputCols, valuesPart) => {
      const returning = outputCols.replace(/\bINSERTED\./gi, '');
      return `${insertPart} ${valuesPart} RETURNING ${returning}`;
    }
  );
  s = s.replace(
    /(UPDATE\s+[\s\S]*?)\s*OUTPUT\s+(INSERTED\.\*|(?:INSERTED\.\w+(?:\s*,\s*INSERTED\.\w+)*))\s+WHERE\s+([\s\S]*)/gi,
    (_, updatePart, outputCols, wherePart) => {
      const returning = outputCols.replace(/\bINSERTED\./gi, '');
      return `${updatePart} WHERE ${wherePart} RETURNING ${returning}`;
    }
  );
  s = s.replace(
    /(DELETE\s+FROM\s+\S+)\s+OUTPUT\s+(DELETED\.\w+)\s+(WHERE\s+.*)/gi,
    (_, deletePart, outputCols, wherePart) => {
      const returning = outputCols.replace(/\bDELETED\./gi, '');
      return `${deletePart} ${wherePart} RETURNING ${returning}`;
    }
  );
  s = s.replace(/\bGETDATE\(\)/gi, 'NOW()');
  s = s.replace(/\b(is_active|is_verified|is_late|is_read|must_change_password)\s*=\s*1\b/gi, '$1 = true');
  s = s.replace(/\b(is_active|is_verified|is_late|is_read|must_change_password)\s*=\s*0\b/gi, '$1 = false');
  s = s.replace(/\[(\w+)\]/g, '"$1"');

  return { text: s, values };
}

async function getPgPool() {
  if (pool) {
    try {
      await pool.query('SELECT 1');
      return pool;
    } catch {
      try { await pool.end(); } catch { }
      pool = null;
    }
  }
  pool = new Pool({
    host: config.db.host || config.db.server,
    port: config.db.port || 5432,
    database: config.db.database,
    user: config.db.user,
    password: config.db.password,
    ssl: config.db.ssl || (process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false),
    connectionTimeoutMillis: 5000,
    statement_timeout: 15000,
  });
  pool.on('error', (err) => {
    console.error('PostgreSQL pool error:', err);
  });
  await pool.query('SELECT 1');
  console.log('Connected to PostgreSQL');
  startKeepAlive();
  return pool;
}

async function getMssqlPool() {
  if (pool) {
    try {
      await pool.request().query('SELECT 1');
      return pool;
    } catch {
      try { await pool.close(); } catch { }
      pool = null;
    }
  }
  const dbConfig = {
    ...config.db,
    connectionTimeout: 5000,
    requestTimeout: 15000,
    options: {
      ...config.db.options,
      encrypt: process.env.DB_ENCRYPT === 'true',
      trustServerCertificate: true,
    },
  };
  pool = await mssql.connect(dbConfig);
  console.log('Connected to SQL Server');
  startKeepAlive();
  return pool;
}

async function getPool() {
  if (dbType === 'postgres') return getPgPool();
  return getMssqlPool();
}

async function pgQuery(queryText, params = {}) {
  let lastError;
  const maxAttempts = 2;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const p = await getPgPool();
      const { text, values } = convertPgSql(queryText, params);
      const result = await p.query(text, values);
      return {
        recordset: result.rows,
        rows: result.rows,
        rowsAffected: [result.rowCount],
        rowCount: result.rowCount,
      };
    } catch (err) {
      lastError = err;
      if (!isConnectionError(err)) throw err;
      try { if (pool) await pool.end(); } catch { }
      pool = null;
      if (attempt < maxAttempts - 1) await sleep(500);
    }
  }
  throw lastError;
}

async function mssqlQuery(queryText, params = {}) {
  let lastError;
  const maxAttempts = 2;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const p = await getMssqlPool();
      const request = p.request();
      Object.entries(params).forEach(([key, value]) => {
        request.input(key, value);
      });
      return await request.query(queryText);
    } catch (err) {
      lastError = err;
      if (!isConnectionError(err)) throw err;
      try { if (pool) await pool.close(); } catch { }
      pool = null;
      if (attempt < maxAttempts - 1) await sleep(500);
    }
  }
  throw lastError;
}

async function query(queryText, params = {}) {
  if (dbType === 'postgres') return pgQuery(queryText, params);
  return mssqlQuery(queryText, params);
}

// Run several statements atomically. `fn` receives { exec } — a query runner
// bound to the transaction that accepts the same @param syntax as `query()`.
// Rolls back on any error. Only use for multi-statement writes.
async function withTransaction(fn) {
  if (dbType === 'postgres') return withPgTransaction(fn);
  return withMssqlTransaction(fn);
}

async function withMssqlTransaction(fn) {
  const p = await getMssqlPool();
  const tx = p.transaction();
  await tx.begin();
  try {
    const exec = async (queryText, params = {}) => {
      const request = tx.request();
      Object.entries(params).forEach(([key, value]) => request.input(key, value));
      return request.query(queryText);
    };
    const result = await fn({ exec });
    await tx.commit();
    return result;
  } catch (err) {
    try { await tx.rollback(); } catch { }
    throw err;
  }
}

async function withPgTransaction(fn) {
  let client = null;
  try {
    client = await (await getPgPool()).connect();
    await client.query('BEGIN');
    const exec = async (queryText, params = {}) => {
      const { text, values } = convertPgSql(queryText, params);
      const result = await client.query(text, values);
      return {
        recordset: result.rows,
        rows: result.rows,
        rowsAffected: [result.rowCount],
        rowCount: result.rowCount,
      };
    };
    const result = await fn({ exec });
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try { if (client) await client.query('ROLLBACK'); } catch { }
    throw err;
  } finally {
    if (client) client.release();
  }
}

module.exports = { getPool, query, withTransaction, isConnectionError, isDuplicateKeyError, convertPgSql, sql: dbType === 'postgres' ? null : mssql };
