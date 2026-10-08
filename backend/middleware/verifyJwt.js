const jwt = require('jsonwebtoken');
const sessionStore = require('../services/sessionStore');

async function verifyJwt(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing token' });
  }

  const token = authHeader.split(' ')[1];
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  // Single-device enforcement: validate the session ID embedded in the token
  if (payload.sessionId) {
    try {
      const activeSessionId = await sessionStore.getActiveSession(payload.email);
      if (activeSessionId !== payload.sessionId) {
        return res.status(401).json({
          message: 'Your session was ended because you logged in on another device. Please log in again.',
          code: 'SESSION_INVALIDATED',
        });
      }
    } catch (err) {
      console.error('[verifyJwt] session check error:', err.message);
      return res.status(401).json({ message: 'Unable to verify session. Please log in again.' });
    }
  }

  req.user = payload;
  return next();
}

module.exports = verifyJwt;
