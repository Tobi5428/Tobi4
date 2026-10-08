/**
 * Middleware: Account Limit Validator
 * 
 * IMPORTANT: This middleware enforces account limits on payment/transfer routes.
 * It is the AUTHORITATIVE check that prevents limit bypass.
 * Frontend validation is informational only.
 */

const { validateTransactionLimit, recordTransaction } = require('../services/accountLimitService');

/**
 * Middleware to validate transaction against user's limits
 * Attaches limit-check results to req.limitCheck for use in route handlers
 * Does NOT reject request here; route handler decides action based on results
 */
async function validateAccountLimit(req, res, next) {
  const email = req.user?.email;
  const amount = req.body?.amount ? Number(req.body.amount) : null;

  // Default to 'outgoing' if not specified (most transactions are outgoing)
  const transactionType = req.body?.limitCheckType || 'outgoing';

  if (!email || !Number.isFinite(amount) || amount <= 0) {
    // Invalid input, let route handler deal with it
    req.limitCheck = {
      validated: false,
      reason: 'Invalid amount or user',
    };
    return next();
  }

  try {
    const validation = await validateTransactionLimit(email, amount, transactionType);
    req.limitCheck = validation;

    if (!validation.allowed) {
      // Log limit violation attempt
      console.warn('[AccountLimitValidator]', {
        email,
        amount,
        type: transactionType,
        errorCode: validation.errorCode,
        at: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error('[AccountLimitValidator] Error validating limit:', err);
    req.limitCheck = {
      validated: false,
      reason: 'Unable to validate limits',
    };
  }

  return next();
}

/**
 * Enforcement version: rejects request immediately if limit exceeded
 * Use this in strict payment endpoints
 */
async function enforceAccountLimit(req, res, next) {
  const email = req.user?.email;
  const amount = req.body?.amount ? Number(req.body.amount) : null;
  const transactionType = req.body?.limitCheckType || 'outgoing';

  if (!email || !Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({
      ok: false,
      message: 'Invalid amount',
      code: 'INVALID_AMOUNT',
    });
  }

  try {
    const validation = await validateTransactionLimit(email, amount, transactionType);

    if (!validation.allowed) {
      // Log violation
      console.warn('[AccountLimitValidator] Limit exceeded', {
        email,
        amount,
        type: transactionType,
        errorCode: validation.errorCode,
        at: new Date().toISOString(),
      });

      return res.status(400).json({
        ok: false,
        message: validation.reason,
        code: validation.errorCode || 'TRANSACTION_LIMIT_EXCEEDED',
      });
    }

    // Validation passed
    req.limitCheck = validation;
    return next();
  } catch (err) {
    console.error('[AccountLimitValidator] Error enforcing limit:', err);
    return res.status(500).json({
      ok: false,
      message: 'Error validating transaction limits',
    });
  }
}

/**
 * Helper: Call this AFTER a transaction is approved to record it in daily totals
 * This updates the daily limit state with atomic operations
 */
async function recordApprovedTransaction(email, amount, transactionType) {
  return recordTransaction(email, amount, transactionType || 'outgoing');
}

module.exports = {
  validateAccountLimit,
  enforceAccountLimit,
  recordApprovedTransaction,
};
