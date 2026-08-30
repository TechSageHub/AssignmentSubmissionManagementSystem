const test = require('node:test');
const assert = require('node:assert/strict');
const { parseInputDate, toStoredUtc, toIsoUtc } = require('../utils/dates');

test('parseInputDate treats naive values as UTC', () => {
  const d = parseInputDate('2026-09-01T23:00');
  assert.ok(d instanceof Date);
  assert.equal(d.toISOString(), '2026-09-01T23:00:00.000Z');
});

test('parseInputDate preserves explicit zone offsets', () => {
  const d = parseInputDate('2026-09-01T23:00:00+01:00');
  assert.equal(d.toISOString(), '2026-09-01T22:00:00.000Z');
});

test('parseInputDate handles Date instances and invalid input', () => {
  const date = new Date('2026-09-01T23:00:00.000Z');
  assert.equal(parseInputDate(date), date);
  assert.equal(parseInputDate('not a date'), null);
  assert.equal(parseInputDate(''), null);
  assert.equal(parseInputDate(null), null);
});

test('toStoredUtc strips the zone suffix for naive UTC storage', () => {
  assert.equal(toStoredUtc('2026-09-01T23:00'), '2026-09-01T23:00:00.000');
  assert.equal(toStoredUtc(new Date('2026-09-01T23:00:00.000Z')), '2026-09-01T23:00:00.000');
  assert.equal(toStoredUtc(null), null);
});

test('toStoredUtc converts zoned input into the UTC instant', () => {
  assert.equal(toStoredUtc('2026-09-01T23:00:00-05:00'), '2026-09-02T04:00:00.000');
});

test('toIsoUtc emits ISO with Z', () => {
  assert.equal(toIsoUtc('2026-09-01T23:00'), '2026-09-01T23:00:00.000Z');
  assert.equal(toIsoUtc(new Date('2026-09-01T23:00:00.000Z')), '2026-09-01T23:00:00.000Z');
});