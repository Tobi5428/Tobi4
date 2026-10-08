const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/user');
const LoginOtpChallenge = require('../models/LoginOtpChallenge');
const { hashPassword, comparePassword, genTokenHex, hashToken } = require('../authHelpers');
const { sendMail } = require('../mailer');
const verifyJwt = require('../middleware/verifyJwt');
const { verifyRecaptcha } = require('../middleware/verifyRecaptcha');
const sessionStore = require('../services/sessionStore');

const router = express.Router();
const memoryUsers = new Map();
const memoryChallenges = new Map();
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_DELAY_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function safeUser(user) {
  if (!user) return null;
  const value = typeof user.toObject === 'function' ? user.toObject() : user;
  const result = { ...value };
  for (const field of [
    'password',
    'resetPasswordTokenHash',
    'resetPasswordExpires',
    'emailChangeTokenHash',
    'emailChangeExpires',
    'pendingEmail',
    'activeSessionId',
  ]) {
    delete result[field];
  }
  return result;
}

async function findUserByEmail(email) {
  if (isMongoConnected()) return User.findOne({ email });
  return memoryUsers.get(normalizeEmail(email)) || null;
}

async function findLoginUser(identifier) {
  const normalized = normalizeEmail(identifier);
  if (isMongoConnected()) {
    return User.findOne({
      $or: [{ email: normalized }, { username: String(identifier || '').trim() }],
    });
  }

  return memoryUsers.get(normalized) ||
    [...memoryUsers.values()].find((user) => user.username === String(identifier || '').trim()) ||
    null;
}

async function createUser(data) {
  if (isMongoConnected()) return User.create(data);
  const user = { ...data, _id: crypto.randomUUID(), createdAt: new Date(), updatedAt: new Date() };
  memoryUsers.set(user.email, user);
  return user;
}

async function updateUser(user, updates) {
  if (isMongoConnected()) {
    return User.findOneAndUpdate({ email: user.email }, { $set: updates }, { new: true, runValidators: true });
  }

  const previousEmail = user.email;
  Object.assign(user, updates, { updatedAt: new Date() });
  if (updates.email && updates.email !== previousEmail) {
    memoryUsers.delete(previousEmail);
    memoryUsers.set(user.email, user);
  }
  return user;
}

async function findChallenge(challengeId) {
  if (isMongoConnected()) return LoginOtpChallenge.findOne({ challengeId });
  return memoryChallenges.get(challengeId) || null;
}

async function saveChallenge(challenge) {
  if (isMongoConnected()) {
    const challengeFields = [
      'userEmail', 'otpHash', 'attempts', 'maxAttempts', 'expiresAt',
      'createdByIp', 'lastSentAt', 'verifiedAt', 'usedAt', 'lockedAt', 'invalidatedAt',
    ];
    const updates = Object.fromEntries(challengeFields.map((field) => [field, challenge[field]]));
    return LoginOtpChallenge.findOneAndUpdate(
      { challengeId: challenge.challengeId },
      { $set: updates },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
  memoryChallenges.set(challenge.challengeId, challenge);
  return challenge;
}

function otpDigest(otp) {
  return crypto.createHash('sha256').update(String(otp)).digest('hex');
}

function digestMatches(value, digest) {
  const actual = Buffer.from(otpDigest(value), 'hex');
  const expected = Buffer.from(digest || '', 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function maskEmail(email) {
  const [local, domain] = String(email || '').split('@');
  if (!local || !domain) return email;
  return `${local.slice(0, 1)}${'*'.repeat(Math.max(2, local.length - 1))}@${domain}`;
}

function challengeResponse(challenge, message) {
  const now = Date.now();
  return {
    ok: true,
    verificationRequired: true,
    challengeId: challenge.challengeId,
    maskedEmail: maskEmail(challenge.userEmail),
    expiresInSeconds: Math.max(0, Math.ceil((new Date(challenge.expiresAt).getTime() - now) / 1000)),
    resendAvailableInSeconds: Math.max(
      0,
      Math.ceil((new Date(challenge.lastSentAt).getTime() + OTP_RESEND_DELAY_MS - now) / 1000)
    ),
    message,
  };
}

async function sendLoginOtp(user, existingChallenge = null) {
  const otp = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  const now = new Date();
  const challenge = {
    challengeId: existingChallenge?.challengeId || crypto.randomUUID(),
    userEmail: user.email,
    otpHash: otpDigest(otp),
    attempts: 0,
    maxAttempts: OTP_MAX_ATTEMPTS,
    expiresAt: new Date(now.getTime() + OTP_TTL_MS),
    createdByIp: 'unknown',
    lastSentAt: now,
    verifiedAt: null,
    usedAt: null,
    lockedAt: null,
    invalidatedAt: null,
  };

  await sendMail({
    to: user.email,
    subject: 'Your JEGA login verification code',
    text: `Your JEGA verification code is ${otp}. It expires in 10 minutes.`,
    html: `<p>Your JEGA verification code is <strong>${otp}</strong>.</p><p>It expires in 10 minutes.</p>`,
  });
  await saveChallenge(challenge);
  return challenge;
}

function tokenForUser(user, sessionId) {
  return jwt.sign(
    { email: user.email, role: user.role || 'user', sessionId },
    process.env.JWT_SECRET || 'dev_secret',
    { expiresIn: '12h' }
  );
}

function frontendUrl(pathAndQuery) {
  const base = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  return `${base}/#/${pathAndQuery}`;
}

async function completeEmailChange(email, token, expectedNewEmail = '') {
  const user = await findUserByEmail(email);
  if (
    !user ||
    !user.pendingEmail ||
    (expectedNewEmail && normalizeEmail(user.pendingEmail) !== expectedNewEmail) ||
    !user.emailChangeTokenHash ||
    !digestMatches(token, user.emailChangeTokenHash) ||
    !user.emailChangeExpires ||
    new Date(user.emailChangeExpires).getTime() <= Date.now()
  ) {
    return { status: 400, body: { message: 'This email verification link is invalid or expired.' } };
  }
  const nextEmail = normalizeEmail(user.pendingEmail);
  if (await findUserByEmail(nextEmail)) {
    return { status: 409, body: { message: 'That email address is already in use.' } };
  }
  const updated = await updateUser(user, {
    email: nextEmail,
    pendingEmail: null,
    emailChangeTokenHash: null,
    emailChangeExpires: null,
    activeSessionId: null,
  });
  await sessionStore.clearActiveSession(email);
  return { status: 200, body: { ok: true, message: 'Email address verified successfully.', user: safeUser(updated) } };
}

router.post('/register', verifyRecaptcha, async (req, res) => {
  try {
    const body = req.body || {};
    const email = normalizeEmail(body.email || body.businessEmail);
    const password = String(body.password || '');

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }
    if (await findUserByEmail(email)) {
      return res.status(409).json({ message: 'This email is already registered.' });
    }

    await createUser({
      email,
      password: await hashPassword(password),
      firstName: String(body.firstName || body.businessName || '').trim(),
      lastName: String(body.lastName || '').trim(),
      phone: String(body.phone || '').trim(),
      businessName: String(body.businessName || '').trim(),
      businessType: String(body.businessType || '').trim(),
      rcNumber: String(body.rcNumber || '').trim(),
      accountType: String(body.accountType || 'personal').trim().toLowerCase(),
      role: 'user',
    });

    console.info('[Auth] Account registration completed.');
    return res.status(201).json({ ok: true, message: 'Account created successfully.' });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'This email is already registered.' });
    }
    console.error('[Auth] Registration failed:', error);
    return res.status(500).json({ message: 'Unable to create your account right now.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const identifier = req.body?.email || req.body?.businessEmail;
    const password = String(req.body?.password || '');
    if (!identifier || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await findLoginUser(identifier);
    if (!user || !(await comparePassword(password, user.password))) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const challenge = await sendLoginOtp(user);
    console.info('[Auth] Login OTP sent.');
    return res.json(challengeResponse(challenge, 'A verification code has been sent to your email.'));
  } catch (error) {
    console.error('[Auth] Login or OTP delivery failed:', error);
    return res.status(502).json({ message: 'Unable to send a login verification code. Please try again.' });
  }
});

router.post('/verify-login-otp', async (req, res) => {
  try {
    const challengeId = String(req.body?.challengeId || '');
    const otp = String(req.body?.otp || '');
    if (!challengeId || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: 'A challenge ID and 6-digit code are required.' });
    }

    const challenge = await findChallenge(challengeId);
    if (!challenge || challenge.usedAt || challenge.invalidatedAt) {
      return res.status(400).json({ message: 'This verification code is no longer valid.' });
    }
    if (challenge.lockedAt || challenge.attempts >= challenge.maxAttempts) {
      return res.status(429).json({ message: 'Too many incorrect codes. Please log in again.', attemptsRemaining: 0 });
    }
    if (new Date(challenge.expiresAt).getTime() <= Date.now()) {
      return res.status(400).json({ message: 'This verification code has expired. Please log in again.' });
    }
    if (!digestMatches(otp, challenge.otpHash)) {
      challenge.attempts += 1;
      if (challenge.attempts >= challenge.maxAttempts) challenge.lockedAt = new Date();
      await saveChallenge(challenge);
      return res.status(401).json({
        message: 'The verification code is incorrect.',
        attemptsRemaining: Math.max(0, challenge.maxAttempts - challenge.attempts),
      });
    }

    challenge.verifiedAt = new Date();
    challenge.usedAt = new Date();
    await saveChallenge(challenge);
    const user = await findUserByEmail(challenge.userEmail);
    if (!user) return res.status(404).json({ message: 'Account not found.' });

    const sessionId = crypto.randomUUID();
    await sessionStore.setActiveSession(user.email, sessionId);
    const token = tokenForUser(user, sessionId);
    console.info('[Auth] Login OTP verified.');
    return res.json({ ok: true, token, user: safeUser(user) });
  } catch (error) {
    console.error('[Auth] Login OTP verification failed:', error);
    return res.status(500).json({ message: 'Unable to verify the login code.' });
  }
});

router.post('/resend-login-otp', async (req, res) => {
  try {
    const challenge = await findChallenge(String(req.body?.challengeId || ''));
    if (!challenge || challenge.usedAt || challenge.invalidatedAt) {
      return res.status(400).json({ message: 'This verification request is no longer valid. Please log in again.' });
    }
    if (challenge.lockedAt || new Date(challenge.expiresAt).getTime() <= Date.now()) {
      return res.status(400).json({ message: 'This verification request has expired. Please log in again.' });
    }

    const resendAvailableAt = new Date(challenge.lastSentAt).getTime() + OTP_RESEND_DELAY_MS;
    if (Date.now() < resendAvailableAt) {
      const seconds = Math.ceil((resendAvailableAt - Date.now()) / 1000);
      return res.status(429).json({
        message: 'Please wait before requesting another code.',
        resendAvailableInSeconds: seconds,
      });
    }

    const user = await findUserByEmail(challenge.userEmail);
    if (!user) return res.status(404).json({ message: 'Account not found.' });
    const nextChallenge = await sendLoginOtp(user, challenge);
    return res.json(challengeResponse(nextChallenge, 'A new verification code has been sent.'));
  } catch (error) {
    console.error('[Auth] Login OTP resend failed:', error);
    return res.status(502).json({ message: 'Unable to resend the verification code.' });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email) return res.status(400).json({ message: 'Email is required.' });

    const user = await findUserByEmail(email);
    if (!user) return res.json({ ok: true, message: 'If an account exists, a reset link has been sent.' });

    const token = genTokenHex();
    const resetLink = frontendUrl(`reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`);
    await updateUser(user, {
      resetPasswordTokenHash: hashToken(token),
      resetPasswordExpires: new Date(Date.now() + 60 * 60 * 1000),
    });

    if (process.env.SMTP_HOST) {
      await sendMail({
        to: email,
        subject: 'Reset your JEGA password',
        text: `Use this link to reset your password: ${resetLink}`,
        html: `<p><a href="${resetLink}">Reset your JEGA password</a></p>`,
      });
      return res.json({ ok: true, message: 'If an account exists, a reset link has been sent.' });
    }

    if (process.env.NODE_ENV === 'production') {
      console.error('[Auth] Password reset mail is unavailable: SMTP_HOST is not configured.');
      return res.status(503).json({ message: 'Password reset is temporarily unavailable.' });
    }
    console.info('[Auth] Password reset link generated in development mode.');
    return res.json({ ok: true, message: 'Password reset link generated for development.', resetLink });
  } catch (error) {
    console.error('[Auth] Password reset request failed:', error);
    return res.status(502).json({ message: 'Unable to send a reset link right now.' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const token = String(req.body?.token || '');
    const password = String(req.body?.password || '');
    if (!email || !token || password.length < 8) {
      return res.status(400).json({ message: 'A valid email, reset token, and password of at least 8 characters are required.' });
    }

    const user = await findUserByEmail(email);
    if (
      !user ||
      !user.resetPasswordTokenHash ||
      !digestMatches(token, user.resetPasswordTokenHash) ||
      !user.resetPasswordExpires ||
      new Date(user.resetPasswordExpires).getTime() <= Date.now()
    ) {
      return res.status(400).json({ message: 'This password reset link is invalid or expired.' });
    }

    await updateUser(user, {
      password: await hashPassword(password),
      resetPasswordTokenHash: null,
      resetPasswordExpires: null,
      activeSessionId: null,
    });
    await sessionStore.clearActiveSession(email);
    return res.json({ ok: true, message: 'Password updated successfully. You can now log in.' });
  } catch (error) {
    console.error('[Auth] Password reset failed:', error);
    return res.status(500).json({ message: 'Unable to reset your password right now.' });
  }
});

router.get('/user', verifyJwt, async (req, res) => {
  try {
    const user = await findUserByEmail(req.user.email);
    if (!user) return res.status(404).json({ message: 'Account not found.' });
    return res.json({ ok: true, user: safeUser(user) });
  } catch (error) {
    console.error('[Auth] Current-user lookup failed:', error);
    return res.status(500).json({ message: 'Unable to load your account.' });
  }
});

router.get('/me', verifyJwt, async (req, res) => {
  try {
    const user = await findUserByEmail(req.user.email);
    if (!user) return res.status(404).json({ message: 'Account not found.' });
    return res.json({ ok: true, user: safeUser(user) });
  } catch (error) {
    console.error('[Auth] Current-user lookup failed:', error);
    return res.status(500).json({ message: 'Unable to load your account.' });
  }
});

router.put('/set-username', verifyJwt, async (req, res) => {
  try {
    const username = String(req.body?.username || '').trim();
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return res.status(400).json({ message: 'Username must be 3-20 characters using letters, numbers, or underscores.' });
    }
    const existing = isMongoConnected()
      ? await User.findOne({ username, email: { $ne: req.user.email } })
      : [...memoryUsers.values()].find((user) => user.username === username && user.email !== req.user.email);
    if (existing) return res.status(409).json({ message: 'That username is already in use.' });

    const user = await findUserByEmail(req.user.email);
    if (!user) return res.status(404).json({ message: 'Account not found.' });
    const updated = await updateUser(user, { username });
    return res.json({ ok: true, message: 'Username updated successfully.', user: safeUser(updated) });
  } catch (error) {
    console.error('[Auth] Username update failed:', error);
    return res.status(500).json({ message: 'Unable to update your username.' });
  }
});

router.put('/update-profile', verifyJwt, async (req, res) => {
  try {
    const user = await findUserByEmail(req.user.email);
    if (!user) return res.status(404).json({ message: 'Account not found.' });

    const allowedFields = [
      'firstName', 'lastName', 'phone', 'address', 'city', 'state', 'country',
      'businessName', 'businessType', 'rcNumber', 'accountType',
    ];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body?.[field] !== undefined) updates[field] = String(req.body[field]).trim();
    }
    const updated = await updateUser(user, updates);
    return res.json({ ok: true, message: 'Profile updated successfully.', user: safeUser(updated) });
  } catch (error) {
    console.error('[Auth] Profile update failed:', error);
    return res.status(500).json({ message: 'Unable to update your profile.' });
  }
});

router.post('/request-email-change', verifyJwt, async (req, res) => {
  try {
    const currentEmail = normalizeEmail(req.body?.currentEmail);
    const newEmail = normalizeEmail(req.body?.newEmail);
    if (currentEmail !== normalizeEmail(req.user.email) || !newEmail) {
      return res.status(400).json({ message: 'Current and new email addresses are required.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      return res.status(400).json({ message: 'Enter a valid new email address.' });
    }
    if (await findUserByEmail(newEmail)) {
      return res.status(409).json({ message: 'That email address is already in use.' });
    }

    const user = await findUserByEmail(currentEmail);
    if (!user) return res.status(404).json({ message: 'Account not found.' });
    const token = genTokenHex();
    await updateUser(user, {
      pendingEmail: newEmail,
      emailChangeTokenHash: hashToken(token),
      emailChangeExpires: new Date(Date.now() + 60 * 60 * 1000),
    });
    const verificationLink = frontendUrl(
      `verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(currentEmail)}`
    );
    if (process.env.SMTP_HOST) {
      await sendMail({
        to: newEmail,
        subject: 'Verify your new JEGA email address',
        text: `Verify your new email address: ${verificationLink}`,
        html: `<p><a href="${verificationLink}">Verify your new email address</a></p>`,
      });
      return res.json({ ok: true, message: 'A verification link has been sent to your new email address.' });
    }
    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({ message: 'Email change verification is temporarily unavailable.' });
    }
    return res.json({
      ok: true,
      message: 'Email change verification link generated for development.',
      verificationLink,
    });
  } catch (error) {
    console.error('[Auth] Email change request failed:', error);
    return res.status(500).json({ message: 'Unable to request an email change.' });
  }
});

router.get('/verify-email', async (req, res) => {
  try {
    const email = normalizeEmail(req.query.email);
    const token = String(req.query.token || '');
    const result = await completeEmailChange(email, token);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('[Auth] Email verification failed:', error);
    return res.status(500).json({ message: 'Unable to verify this email address.' });
  }
});

router.post('/confirm-email-change', async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.currentEmail);
    const newEmail = normalizeEmail(req.body?.newEmail);
    const token = String(req.body?.token || '');
    const result = await completeEmailChange(email, token, newEmail);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('[Auth] Email verification failed:', error);
    return res.status(500).json({ message: 'Unable to verify this email address.' });
  }
});

router.post('/logout', verifyJwt, async (req, res) => {
  try {
    await sessionStore.clearActiveSession(req.user.email);
    return res.json({ ok: true, message: 'Logged out successfully.' });
  } catch (error) {
    console.error('[Auth] Logout failed:', error);
    return res.status(500).json({ message: 'Unable to log out right now.' });
  }
});

module.exports = router;
