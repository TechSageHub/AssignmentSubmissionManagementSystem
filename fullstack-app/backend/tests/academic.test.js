const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeDept,
  isSameDepartment,
  matchesLevel,
  isTargetLevelAllowed,
} = require('../utils/academic');

test('normalizeDept trims and lowercases', () => {
  assert.equal(normalizeDept('  Computer Science  '), 'computer science');
  assert.equal(normalizeDept(null), '');
});

test('isSameDepartment matches departments case-insensitively', () => {
  assert.equal(isSameDepartment('Computer Science', 'computer science'), true);
  assert.equal(isSameDepartment('Computer Science', 'Electrical Engineering'), false);
  assert.equal(isSameDepartment(null, 'Computer Science'), true);
});

test('matchesLevel handles all level combinations correctly', () => {
  assert.equal(matchesLevel('ND I', 'ND I'), true);
  assert.equal(matchesLevel('ND I', 'ND II'), false);
  assert.equal(matchesLevel('ND I', 'ND (All)'), true);
  assert.equal(matchesLevel('ND II', 'ND (All)'), true);
  assert.equal(matchesLevel('HND I', 'ND (All)'), false);

  assert.equal(matchesLevel('HND I', 'HND (All)'), true);
  assert.equal(matchesLevel('HND II', 'HND (All)'), true);
  assert.equal(matchesLevel('ND I', 'HND (All)'), false);

  assert.equal(matchesLevel('ND I', 'All Levels'), true);
  assert.equal(matchesLevel('HND II', 'All Levels'), true);
  assert.equal(matchesLevel('HND I', null), true);
});

test('isTargetLevelAllowed enforces lecturer teaching scope', () => {
  // ND Only lecturer
  assert.equal(isTargetLevelAllowed('nd', 'ND I'), true);
  assert.equal(isTargetLevelAllowed('nd', 'ND II'), true);
  assert.equal(isTargetLevelAllowed('nd', 'ND (All)'), true);
  assert.equal(isTargetLevelAllowed('nd', 'HND I'), false);
  assert.equal(isTargetLevelAllowed('nd', 'HND (All)'), false);
  assert.equal(isTargetLevelAllowed('nd', 'All Levels'), false);

  // HND Only lecturer
  assert.equal(isTargetLevelAllowed('hnd', 'HND I'), true);
  assert.equal(isTargetLevelAllowed('hnd', 'HND II'), true);
  assert.equal(isTargetLevelAllowed('hnd', 'HND (All)'), true);
  assert.equal(isTargetLevelAllowed('hnd', 'ND I'), false);
  assert.equal(isTargetLevelAllowed('hnd', 'ND (All)'), false);
  assert.equal(isTargetLevelAllowed('hnd', 'All Levels'), false);

  // Both ND & HND lecturer
  assert.equal(isTargetLevelAllowed('both', 'ND I'), true);
  assert.equal(isTargetLevelAllowed('both', 'HND I'), true);
  assert.equal(isTargetLevelAllowed('both', 'All Levels'), true);
});
