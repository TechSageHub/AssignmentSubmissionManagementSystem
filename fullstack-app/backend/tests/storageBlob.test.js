const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const fs = require('fs');
const path = require('path');
const storageBlobModel = require('../models/storageBlob');

test('isMissingTableError detects missing table errors', () => {
  assert.equal(storageBlobModel.isMissingTableError({ message: 'Invalid object name \'StorageBlobs\'' }), true);
  assert.equal(storageBlobModel.isMissingTableError({ message: 'relation "StorageBlobs" does not exist' }), true);
  assert.equal(storageBlobModel.isMissingTableError({ message: 'Syntax error near SELECT' }), false);
  assert.equal(storageBlobModel.isMissingTableError(null), false);
});
