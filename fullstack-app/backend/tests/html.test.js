const test = require('node:test');
const assert = require('node:assert/strict');
const { escapeHtml } = require('../utils/html');

test('escapeHtml escapes HTML metacharacters', () => {
  assert.equal(escapeHtml('<script>alert("x")</script>'), '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
});

test('escapeHtml handles apostrophes, ampersands and nullish input', () => {
  assert.equal(escapeHtml("it's"), 'it&#39;s');
  assert.equal(escapeHtml('a & b'), 'a &amp; b');
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(undefined), '');
  assert.equal(escapeHtml(123), '123');
});