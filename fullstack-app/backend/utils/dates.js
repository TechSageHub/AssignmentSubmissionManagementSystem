// Due dates are stored as timezone-free UTC wall-clock values:
//   - DB columns (DATETIME2 on SQL Server, TIMESTAMP on Postgres) hold naive
//     'YYYY-MM-DDTHH:mm:ss.sss' strings representing a UTC instant.
//   - The API always emits ISO-8601 with 'Z' so browsers render in local time.
//   - "Now" comparisons happen in UTC: SQL Server uses SYSUTCDATETIME() and
//     Postgres NOW(); both are already UTC.
//
// Legacy clients may still send a naive "YYYY-MM-DDTHH:mm" value with no zone
// indicator; we interpret it as UTC (parseInputDate appends 'Z').

function parseInputDate(value) {
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }
  let s = value.trim();
  if (!/[zZ]|[+-]\d{2}:?\d{2}$/.test(s)) {
    s += 'Z';
  }
  const parsed = new Date(s);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function toStoredUtc(value) {
  const parsed = parseInputDate(value);
  return parsed ? parsed.toISOString().replace('Z', '') : null;
}

function toIsoUtc(value) {
  const parsed = parseInputDate(value);
  return parsed ? parsed.toISOString() : value;
}

module.exports = { parseInputDate, toStoredUtc, toIsoUtc };