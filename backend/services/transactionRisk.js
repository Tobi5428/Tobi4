const crypto = require('crypto');

const RISK_FLAGS = {
  NEW_IP_ADDRESS: 'NEW_IP_ADDRESS',
  MISSING_DEVICE_FINGERPRINT: 'MISSING_DEVICE_FINGERPRINT',
};

function normalizeIp(rawIp) {
  const ip = String(rawIp || '').trim();
  if (!ip) return 'unknown';

  if (ip.startsWith('::ffff:')) {
    return ip.slice('::ffff:'.length);
  }

  if (ip === '::1') {
    return '127.0.0.1';
  }

  return ip;
}

function extractCustomerIp(req) {
  const trustProxy = String(process.env.TRUST_PROXY || 'false').toLowerCase() === 'true';
  const headerName = String(process.env.IP_HEADER_NAME || 'X-Forwarded-For').toLowerCase();

  let ipValue = null;
  if (trustProxy) {
    const headerValue = req.headers?.[headerName];
    if (typeof headerValue === 'string' && headerValue.trim()) {
      ipValue = headerValue.split(',')[0].trim();
    }
  }

  if (!ipValue) {
    ipValue = req.socket?.remoteAddress || req.ip || 'unknown';
  }

  return normalizeIp(ipValue);
}

function readDeviceFingerprint(req) {
  return (
    req.headers?.['x-device-fingerprint'] ||
    req.body?.deviceFingerprint ||
    req.body?.fingerprint ||
    req.body?.fingerprintToken ||
    req.body?.deviceToken ||
    null
  );
}

function isValidDeviceFingerprint(value) {
  if (typeof value !== 'string') return false;
  const v = value.trim();
  if (v.length < 16 || v.length > 200) return false;
  return /^[a-zA-Z0-9._:-]+$/.test(v);
}

function normalizeDeviceFingerprint(value) {
  if (!isValidDeviceFingerprint(value)) {
    return 'missing';
  }
  return String(value).trim();
}

function maybeHashIp(ip) {
  const shouldHash = String(process.env.HASH_CUSTOMER_IP || 'false').toLowerCase() === 'true';
  if (!shouldHash) return ip;
  return crypto.createHash('sha256').update(ip).digest('hex');
}

async function evaluateTransactionRisk({
  customerId,
  customerIp,
  deviceFingerprint,
  hasKnownCustomerIp,
}) {
  const riskFlags = [];
  let reviewStatus = 'none';
  let reviewReason = null;

  const enableIpRiskRule = String(process.env.ENABLE_IP_RISK_RULE || 'true').toLowerCase() === 'true';

  if (!isValidDeviceFingerprint(deviceFingerprint)) {
    riskFlags.push(RISK_FLAGS.MISSING_DEVICE_FINGERPRINT);
  }

  if (enableIpRiskRule && customerId && customerIp) {
    const knownIp = await hasKnownCustomerIp(customerId, customerIp);
    if (!knownIp) {
      riskFlags.push(RISK_FLAGS.NEW_IP_ADDRESS);
      reviewStatus = 'manual_review_required';
      reviewReason = 'New IP address detected for customer';
    }
  }

  return {
    riskFlags,
    reviewStatus,
    reviewReason,
  };
}

module.exports = {
  RISK_FLAGS,
  normalizeIp,
  extractCustomerIp,
  readDeviceFingerprint,
  isValidDeviceFingerprint,
  normalizeDeviceFingerprint,
  maybeHashIp,
  evaluateTransactionRisk,
};
