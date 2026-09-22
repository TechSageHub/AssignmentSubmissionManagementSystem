const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveAppealEligibility } = require('../models/gradeAppeal');

function grade(releasedAt) {
  return { released_at: releasedAt };
}

test('resolveAppealEligibility rejects when no grade exists', () => {
  const result = resolveAppealEligibility({ grade: null, existingAppeal: null });
  assert.equal(result.ok, false);
  assert.equal(result.status, 409);
});

test('resolveAppealEligibility rejects un-released grades', () => {
  assert.equal(resolveAppealEligibility({ grade: grade(null), existingAppeal: null }).ok, false);
  assert.equal(resolveAppealEligibility({ grade: grade('2030-01-01T00:00:00Z'), existingAppeal: null }).ok, false);
});

test('resolveAppealEligibility allows released grades', () => {
  const result = resolveAppealEligibility({ grade: grade('2020-01-01T00:00:00Z'), existingAppeal: null });
  assert.equal(result.ok, true);
});

test('resolveAppealEligibility blocks a second appeal on the same submission', () => {
  const result = resolveAppealEligibility({ grade: grade('2020-01-01T00:00:00Z'), existingAppeal: { id: 1, status: 'open' } });
  assert.equal(result.ok, false);
  assert.equal(result.status, 409);
});