'use strict';

const mongoose = require('mongoose');

// In-memory fallback: email (lowercase) -> sessionId
const activeSessions = new Map();

function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}

/**
 * Persist the active sessionId for a user.
 * Replaces any previous session so only one device stays authenticated.
 */
async function setActiveSession(email, sessionId) {
  const key = String(email || '').toLowerCase();
  if (!key) return;

  activeSessions.set(key, sessionId || null);

  if (isMongoConnected()) {
    const User = require('../models/user');
    await User.findOneAndUpdate({ email: key }, { $set: { activeSessionId: sessionId || null } });
  }
}

/**
 * Return the currently stored sessionId for a user.
 * Returns null if no active session or user not found.
 */
async function getActiveSession(email) {
  const key = String(email || '').toLowerCase();
  if (!key) return null;

  if (isMongoConnected()) {
    const User = require('../models/user');
    const user = await User.findOne({ email: key }).select('activeSessionId').lean();
    return user?.activeSessionId || null;
  }

  return activeSessions.get(key) || null;
}

/**
 * Clear the active session for a user (call on logout or password change).
 */
async function clearActiveSession(email) {
  return setActiveSession(email, null);
}

module.exports = { setActiveSession, getActiveSession, clearActiveSession };
