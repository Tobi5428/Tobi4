const GOOGLE_SITEVERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';
const DEFAULT_MIN_SCORE = 0.5;

function getMinimumScore(value = process.env.RECAPTCHA_MIN_SCORE) {
  if (value === undefined || String(value).trim() === '') {
    return DEFAULT_MIN_SCORE;
  }

  const score = Number(value);
  if (!Number.isFinite(score) || score < 0 || score > 1) {
    console.warn('[reCAPTCHA] Invalid RECAPTCHA_MIN_SCORE; using 0.5.');
    return DEFAULT_MIN_SCORE;
  }
  return score;
}

async function verifyRecaptchaToken(
  token,
  {
    secretKey = process.env.RECAPTCHA_SECRET_KEY,
    minimumScore = getMinimumScore(),
    fetchImpl = globalThis.fetch,
  } = {}
) {
  if (!secretKey) {
    return { ok: false, reason: 'not_configured', minimumScore };
  }
  if (typeof token !== 'string' || token.trim() === '') {
    return { ok: false, reason: 'missing_token', minimumScore };
  }
  if (typeof fetchImpl !== 'function') {
    throw new Error('Fetch is unavailable for reCAPTCHA verification.');
  }

  const body = new URLSearchParams({ secret: secretKey, response: token });
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  let response;
  try {
    response = await fetchImpl(GOOGLE_SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(`Google reCAPTCHA verification returned HTTP ${response.status}.`);
  }

  const result = await response.json();
  const score = Number(result.score);
  if (!result.success) {
    return { ok: false, reason: 'verification_failed', minimumScore };
  }
  if (result.action !== 'signup') {
    return { ok: false, reason: 'action_mismatch', score, minimumScore };
  }
  if (!Number.isFinite(score) || score < minimumScore) {
    return { ok: false, reason: 'score_too_low', score, minimumScore };
  }

  return { ok: true, score, minimumScore };
}

async function verifyRecaptcha(req, res, next) {
  try {
    const result = await verifyRecaptchaToken(req.body?.recaptchaToken);
    if (result.ok) {
      console.info(`[reCAPTCHA] Signup verification passed (score ${result.score}).`);
      return next();
    }

    if (result.reason === 'not_configured') {
      console.error('[reCAPTCHA] Signup rejected: RECAPTCHA_SECRET_KEY is not configured.');
      return res.status(503).json({ message: 'Signup verification is temporarily unavailable.' });
    }
    if (result.reason === 'missing_token') {
      console.warn('[reCAPTCHA] Signup rejected: no token was provided.');
      return res.status(400).json({ message: 'reCAPTCHA verification is required.' });
    }
    if (result.reason === 'score_too_low') {
      console.warn(`[reCAPTCHA] Signup rejected: score ${result.score} is below ${result.minimumScore}.`);
    } else {
      console.warn(`[reCAPTCHA] Signup rejected: ${result.reason}.`);
    }
    return res.status(403).json({ message: 'reCAPTCHA verification failed. Please try again.' });
  } catch (error) {
    console.error('[reCAPTCHA] Google verification request failed:', error.message);
    return res.status(502).json({ message: 'Signup verification is temporarily unavailable.' });
  }
}

module.exports = { getMinimumScore, verifyRecaptchaToken, verifyRecaptcha };
