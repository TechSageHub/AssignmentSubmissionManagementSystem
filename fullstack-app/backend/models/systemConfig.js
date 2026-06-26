const { query } = require('../config/db');

async function getAll() {
  const result = await query('SELECT [key], [value] FROM SystemConfig');
  const config = {};
  for (const row of result.recordset) {
    config[row.key] = row.value;
  }
  return config;
}

module.exports = { getAll };
