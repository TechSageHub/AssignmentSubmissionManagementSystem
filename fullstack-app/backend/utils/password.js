const { randomInt } = require('crypto');

// 14 chars, no ambiguous characters (0/O, 1/l, etc.). Cryptographically random
// via crypto.randomInt, so generated passwords are suitable as temporary ones.
const CHARSET =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';

function generateTemporaryPassword(length = 14) {
  if (length < 8) length = 8;
  let result = '';
  for (let i = 0; i < length; i++) {
    result += CHARSET[randomInt(CHARSET.length)];
  }
  return result;
}

module.exports = { generateTemporaryPassword };