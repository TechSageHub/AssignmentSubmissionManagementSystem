const { test } = require('node:test');
const assert = require('node:assert');
const { generateTemporaryPassword } = require('../utils/password');

test('generates a password of the requested length', () => {
  assert.equal(generateTemporaryPassword().length, 14);
  assert.equal(generateTemporaryPassword(10).length, 10);
});

test('never returns a password shorter than 8 characters', () => {
  assert.equal(generateTemporaryPassword(4).length, 8);
});

test('only uses characters from the safe charset', () => {
  const safeSet = new Set('ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*');
  for (const ch of generateTemporaryPassword(200)) {
    assert.ok(safeSet.has(ch), `unexpected character: ${ch}`);
  }
});

test('contains no ambiguous characters (0, O, 1, l)', () => {
  assert.doesNotMatch(generateTemporaryPassword(200), /[0O1l]/);
});

test('generates unique passwords', () => {
  const seen = new Set(Array.from({ length: 50 }, () => generateTemporaryPassword()));
  assert.equal(seen.size, 50);
});