const crypto = require('crypto');
const bcrypt = require('bcryptjs');

function genTokenHex() {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

async function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

module.exports = { genTokenHex, hashToken, hashPassword, comparePassword };
