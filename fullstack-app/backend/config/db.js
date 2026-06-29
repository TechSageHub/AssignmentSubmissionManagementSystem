const mssql = require('mssql');
const { Pool } = require('pg');
const config = require('./env');

const dbType = process.env.DB_TYPE || 'mssql';

let pool = null;
let keepAliveTimer = null;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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

module.exports = { getPool, query, sql: dbType === 'postgres' ? null : mssql };
