const express = require('express');
const crypto = require('crypto');
const mongoose = require('mongoose');
const verifyJwt = require('../middleware/verifyJwt');
const requireAdmin = require('../middleware/requireAdmin');
const Transaction = require('../models/Transaction');
const { validateTransactionLimit, recordTransaction } = require('../services/accountLimitService');
const {
  extractCustomerIp,
  readDeviceFingerprint,
  normalizeDeviceFingerprint,
  maybeHashIp,
  evaluateTransactionRisk,
} = require('../services/transactionRisk');
const {
  evaluateDepositRisk,
  findRiskEventByIdempotencyKey,
  recordRiskEvaluation,
  markEventOutcome,
  markEventOutcomeByTransactionId,
  updateFingerprintStats,
  withUserLock,
  setAllowlist,
  unblockUser,
  getUserRiskState,
  listRiskEvents,
  getRiskConfig,
} = require('../services/riskEngine');

const router = express.Router();

const memoryTransactions = [];
const memoryTransactionsById = new Map();

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

function canUseMongo() {
  return mongoose.connection.readyState === 1;
}

function makeDepositId() {
  return `dep_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

function sanitizeUserId(req, body) {
  return body.customerId || body.userId || req.user?.email;
}

function isDeclinedSimulation(body) {
  return body.forceDecline === true || String(body.cardBinLast4 || '').endsWith('00');
}

function auditRiskEvent(event, details = {}) {
  console.info(
    '[payment-risk-audit]',
    JSON.stringify({
      event,
      at: new Date().toISOString(),
      ...details,
    })
  );
}

async function hasKnownCustomerIp(customerId, customerIp) {
  if (canUseMongo()) {
    const exists = await Transaction.exists({ customerId, customerIp });
    return Boolean(exists);
  }

  return memoryTransactions.some((tx) => tx.customerId === customerId && tx.customerIp === customerIp);
}

async function upsertTransaction(record) {
  if (canUseMongo()) {
    const tx = await Transaction.findOneAndUpdate(
      { transactionId: record.transactionId },
      { $setOnInsert: record },
      { upsert: true, new: true, runValidators: true }
    ).lean();
    return tx;
  }

  const existingId = memoryTransactionsById.get(record.transactionId);
  if (existingId) {
    const existing = memoryTransactions.find((item) => item.id === existingId);
    if (existing) return existing;
  }

  const stored = {
    ...record,
    id: record.transactionId,
    _id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  memoryTransactions.unshift(stored);
  memoryTransactionsById.set(record.transactionId, stored.id);
  return stored;
}

async function listCustomerTransactions(customerId) {
  if (canUseMongo()) {
    return Transaction.find({ customerId }).sort({ createdAt: -1 }).limit(200).lean();
  }
  return memoryTransactions.filter((item) => item.customerId === customerId);
}

async function findTransactionById(transactionId) {
  if (canUseMongo()) {
    return Transaction.findOne({ transactionId }).lean();
  }
  return memoryTransactions.find((item) => item.transactionId === transactionId || item.id === transactionId) || null;
}

async function updateTransaction(transactionId, updates) {
  if (canUseMongo()) {
    return Transaction.findOneAndUpdate(
      { transactionId },
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();
  }

  const transaction = await findTransactionById(transactionId);
  if (!transaction) return null;

  Object.assign(transaction, updates, { updatedAt: new Date().toISOString() });
  return transaction;
}

async function transitionTransactionStatus(transactionId, status, updates = {}) {
  if (canUseMongo()) {
    const transaction = await Transaction.findOneAndUpdate(
      { transactionId, status: 'pending' },
      { $set: { ...updates, status } },
      { new: true, runValidators: true }
    ).lean();
    return { transaction, transitioned: Boolean(transaction) };
  }

  const transaction = await findTransactionById(transactionId);
  if (!transaction || transaction.status !== 'pending') {
    return { transaction, transitioned: false };
  }

  Object.assign(transaction, updates, { status, updatedAt: new Date().toISOString() });
  return { transaction, transitioned: true };
}

async function requestFlutterwave(pathname, options = {}) {
  const secretKey = process.env.FLW_SECRET_KEY?.trim();
  if (!secretKey) {
    const error = new Error('Flutterwave is not configured.');
    error.code = 'FLW_NOT_CONFIGURED';
    throw error;
  }

  const response = await fetch(`https://api.flutterwave.com/v3${pathname}`, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.status !== 'success') {
    const error = new Error('Flutterwave request failed.');
    error.code = 'FLW_API_ERROR';
    error.status = response.status;
    throw error;
  }

  return result.data;
}

function matchesFlutterwaveTransaction(providerTransaction, transaction, expectedProviderId) {
  return (
    String(providerTransaction?.id || '') === String(expectedProviderId) &&
    String(providerTransaction?.tx_ref || '') === transaction.transactionId &&
    Number(providerTransaction?.amount) === Number(transaction.amount) &&
    String(providerTransaction?.currency || '').toUpperCase() ===
      String(transaction.currency || '').toUpperCase()
  );
}

async function settleVerifiedTransaction(transaction, providerTransaction) {
  const providerStatus = String(providerTransaction.status || '').toLowerCase();
  const targetStatus =
    providerStatus === 'successful'
      ? 'successful'
      : ['failed', 'cancelled', 'canceled'].includes(providerStatus)
      ? 'declined'
      : null;
  const metadata = {
    ...transaction.metadata,
    flwTransactionId: String(providerTransaction.id),
    flwReference: providerTransaction.flw_ref || null,
    providerStatus,
  };

  if (!targetStatus) {
    const updated = await updateTransaction(transaction.transactionId, { metadata });
    return { transaction: updated || transaction, transitioned: false };
  }

  const result = await transitionTransactionStatus(transaction.transactionId, targetStatus, { metadata });
  if (!result.transitioned) return result;

  await markEventOutcomeByTransactionId(
    transaction.transactionId,
    targetStatus === 'successful' ? 'succeeded' : 'declined'
  );
  await updateFingerprintStats({
    userId: transaction.customerId,
    cardFingerprint: metadata.cardFingerprint || null,
    cardBinLast4: metadata.cardBinLast4 || null,
    outcome: targetStatus === 'successful' ? 'succeeded' : 'declined',
  });

  if (targetStatus === 'successful' && metadata.userEmail && metadata.transactionType) {
    try {
      await recordTransaction(metadata.userEmail, transaction.amount, metadata.transactionType);
    } catch (error) {
      console.error('[Payment] Error recording transaction limit:', error);
    }
  }

  return result;
}

function safeWebhookHashMatches(receivedHash, configuredHash) {
  if (typeof receivedHash !== 'string' || !configuredHash) return false;
  const received = Buffer.from(receivedHash);
  const configured = Buffer.from(configuredHash);
  return received.length === configured.length && crypto.timingSafeEqual(received, configured);
}

async function listPendingManualReviews(limit) {
  if (canUseMongo()) {
    return Transaction.find({ reviewStatus: 'manual_review_required' }).sort({ createdAt: -1 }).limit(limit).lean();
  }
  return memoryTransactions
    .filter((item) => item.reviewStatus === 'manual_review_required')
    .slice(0, limit);
}

async function updateReviewDecision({ transactionId, decision, reviewedBy, reviewerNote }) {
  const reviewedAt = new Date();
  if (canUseMongo()) {
    return Transaction.findOneAndUpdate(
      { transactionId },
      {
        reviewStatus: decision,
        reviewedBy,
        reviewedAt,
        reviewerNote: reviewerNote || null,
      },
      { new: true }
    ).lean();
  }

  const tx = memoryTransactions.find((item) => item.transactionId === transactionId || item.id === transactionId);
  if (!tx) return null;

  tx.reviewStatus = decision;
  tx.reviewedBy = reviewedBy;
  tx.reviewedAt = reviewedAt.toISOString();
  tx.reviewerNote = reviewerNote || null;
  tx.updatedAt = new Date().toISOString();
  return tx;
}

router.post('/initiate', verifyJwt, async (req, res) => {
  const userId = sanitizeUserId(req, req.body || {});
  const amount = toNumber(req.body?.amount);
  const customerEmail = req.body?.email || req.user?.email;

  if (!userId) return res.status(400).json({ message: 'Missing user identifier.' });
  if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ message: 'Invalid amount.' });
  if (!customerEmail) return res.status(400).json({ message: 'Customer email is required.' });

  // ACCOUNT LIMITS CHECK: Enforce transaction limits BEFORE risk evaluation
  // Backend is authoritative; frontend validation is informational only
  const transactionType = req.body?.limitCheckType || 'outgoing'; // 'outgoing' or 'incoming'
  const userEmail = req.user?.email || userId;

  try {
    const limitValidation = await validateTransactionLimit(userEmail, amount, transactionType);
    if (!limitValidation.allowed) {
      // Log limit violation attempt for audit trail
      console.warn('[Payment] Account limit exceeded', {
        user: userEmail,
        amount,
        type: transactionType,
        errorCode: limitValidation.errorCode,
        reason: limitValidation.reason,
        timestamp: new Date().toISOString(),
      });

      return res.status(400).json({
        ok: false,
        message: limitValidation.reason,
        code: limitValidation.errorCode || 'TRANSACTION_LIMIT_EXCEEDED',
        reason: limitValidation.reason,
      });
    }
  } catch (err) {
    console.error('[Payment] Error checking account limits:', err);
    return res.status(500).json({
      ok: false,
      message: 'Error validating transaction limits',
      code: 'LIMIT_VALIDATION_ERROR',
    });
  }

  const cardFingerprint = req.body?.cardFingerprint || req.body?.cardToken || null;
  const cardBinLast4 = req.body?.cardBinLast4 || null;
  const deviceId = req.body?.deviceId || null;
  const geo = req.body?.geo || null;
  const idempotencyKey = req.headers['idempotency-key'] || req.body?.idempotencyKey || null;
  const currency = req.body?.currency || 'NGN';
  const ip = maybeHashIp(extractCustomerIp(req));
  const rawFingerprint = readDeviceFingerprint(req);
  const deviceFingerprint = normalizeDeviceFingerprint(rawFingerprint);

  try {
    const result = await withUserLock(userId, async () => {
      const existing = await findRiskEventByIdempotencyKey(userId, idempotencyKey);
      if (existing) {
        const transaction = await findTransactionById(existing.transactionId);
        return {
          reused: true,
          event: existing,
          transaction,
          decision: existing.decision,
          code:
            existing.decision === 'BLOCK'
              ? 'HIGH_RISK_BLOCK'
              : existing.decision === 'REVIEW'
              ? 'RISK_REVIEW_REQUIRED'
              : 'ALLOWED',
        };
      }

      const depositId = req.body?.depositId || makeDepositId();
      const transactionId = req.body?.transactionId || req.body?.tx_ref || depositId;

      const transactionRisk = await evaluateTransactionRisk({
        customerId: userId,
        customerIp: ip,
        deviceFingerprint: rawFingerprint,
        hasKnownCustomerIp,
      });

      const evaluation = await evaluateDepositRisk({
        userId,
        transactionId,
        depositId,
        idempotencyKey,
        amount,
        currency,
        ip,
        deviceId,
        geo,
        cardFingerprint,
        cardBinLast4,
        metadata: {
          source: 'payment_initiate',
        },
      });

      const event = await recordRiskEvaluation(
        {
          userId,
          transactionId,
          depositId,
          idempotencyKey,
          amount,
          currency,
          ip,
          deviceId,
          geo,
          cardFingerprint,
          cardBinLast4,
          metadata: {
            source: 'payment_initiate',
          },
        },
        evaluation
      );

      let reviewStatus = transactionRisk.reviewStatus;
      let reviewReason = transactionRisk.reviewReason;
      const riskFlags = [...transactionRisk.riskFlags];

      if (evaluation.decision === 'REVIEW' && reviewStatus === 'none') {
        reviewStatus = 'manual_review_required';
        reviewReason = 'System risk review required';
      }

      let status = 'submitted';

      if (evaluation.decision === 'BLOCK') {
        await updateFingerprintStats({ userId, cardFingerprint, cardBinLast4, outcome: 'declined' });
        await markEventOutcome(event._id, 'blocked');

        const transaction = await upsertTransaction({
          transactionId,
          customerId: userId,
          customerIp: ip,
          deviceFingerprint,
          amount,
          currency,
          status: 'blocked',
          riskFlags,
          reviewStatus,
          reviewReason,
          metadata: {
            tx_ref: req.body?.tx_ref || transactionId,
            idempotencyKey,
          },
        });

        auditRiskEvent('transaction_blocked', {
          customerId: userId,
          transactionId,
          riskFlags,
          reviewStatus,
          reviewReason,
        });

        return {
          transaction,
          event,
          decision: 'BLOCK',
          code: 'HIGH_RISK_BLOCK',
        };
      }

      if (reviewStatus === 'manual_review_required') {
        await updateFingerprintStats({ userId, cardFingerprint, cardBinLast4, outcome: 'attempted' });
        await markEventOutcome(event._id, 'review');

        status = 'pending_manual_review';
        const transaction = await upsertTransaction({
          transactionId,
          customerId: userId,
          customerIp: ip,
          deviceFingerprint,
          amount,
          currency,
          status,
          riskFlags,
          reviewStatus,
          reviewReason,
          metadata: {
            tx_ref: req.body?.tx_ref || transactionId,
            idempotencyKey,
          },
        });

        auditRiskEvent('transaction_manual_review', {
          customerId: userId,
          transactionId,
          riskFlags,
          reviewStatus,
          reviewReason,
        });

        return {
          transaction,
          event,
          decision: 'REVIEW',
          code: 'RISK_REVIEW_REQUIRED',
        };
      }

      // Preserve the existing local decline simulation without contacting the provider.
      const declined = isDeclinedSimulation(req.body || {});
      if (declined) {
        await updateFingerprintStats({ userId, cardFingerprint, cardBinLast4, outcome: 'declined' });
        await markEventOutcome(event._id, 'declined');

        const transaction = await upsertTransaction({
          transactionId,
          customerId: userId,
          customerIp: ip,
          deviceFingerprint,
          amount,
          currency,
          status: 'declined',
          riskFlags,
          reviewStatus,
          reviewReason,
          metadata: {
            tx_ref: req.body?.tx_ref || transactionId,
            idempotencyKey,
          },
        });

        auditRiskEvent('transaction_declined', {
          customerId: userId,
          transactionId,
          riskFlags,
          reviewStatus,
          reviewReason,
        });

        return {
          transaction,
          event,
          decision: 'ALLOW',
          code: 'PAYMENT_DECLINED',
          declined: true,
        };
      }

      await updateFingerprintStats({ userId, cardFingerprint, cardBinLast4, outcome: 'attempted' });
      await markEventOutcome(event._id, 'attempted');

      const transaction = await upsertTransaction({
        transactionId,
        customerId: userId,
        customerIp: ip,
        deviceFingerprint,
        amount,
        currency,
        status: 'pending',
        riskFlags,
        reviewStatus,
        reviewReason,
        metadata: {
          tx_ref: req.body?.tx_ref || transactionId,
          idempotencyKey,
          userEmail,
          transactionType,
          cardFingerprint,
          cardBinLast4,
        },
      });

      return {
        transaction,
        event,
        decision: 'ALLOW',
        code: 'PAYMENT_PENDING',
      };
    });

    if (result.decision === 'BLOCK') {
      return res.status(403).json({
        code: 'HIGH_RISK_BLOCK',
        message: 'Deposit temporarily unavailable. Please contact support.',
        reviewStatus: result.transaction?.reviewStatus || 'none',
        reviewReason: result.transaction?.reviewReason || null,
      });
    }

    if (result.decision === 'REVIEW') {
      return res.status(202).json({
        code: 'RISK_REVIEW_REQUIRED',
        message: 'Transaction submitted and pending manual review.',
        reviewStatus: result.transaction?.reviewStatus || 'manual_review_required',
        reviewReason: result.transaction?.reviewReason || 'New IP address detected for customer',
        data: {
          reference: result.transaction?.transactionId,
          riskFlags: result.transaction?.riskFlags || [],
        },
      });
    }

    if (result.code === 'PAYMENT_DECLINED') {
      return res.status(402).json({
        code: 'PAYMENT_DECLINED',
        message: 'Payment was declined. Please try another card.',
        reviewStatus: result.transaction?.reviewStatus || 'none',
        reviewReason: result.transaction?.reviewReason || null,
      });
    }

    const transaction = result.transaction;
    if (!transaction) {
      return res.status(500).json({ message: 'Could not load the payment transaction.' });
    }

    if (transaction.status === 'successful') {
      return res.json({
        success: true,
        message: 'Payment was already verified.',
        data: {
          link: null,
          reference: transaction.transactionId,
          providerReference: transaction.metadata?.flwReference || null,
          status: transaction.status,
        },
      });
    }

    if (transaction.status !== 'pending') {
      return res.status(409).json({
        code: 'PAYMENT_NOT_PENDING',
        message: 'This payment cannot be initiated in its current state.',
        status: transaction.status,
      });
    }

    if (transaction.metadata?.flwCheckoutLink) {
      return res.json({
        success: true,
        message: result.reused ? 'Request replayed from idempotency record.' : 'Deposit initiated successfully.',
        data: {
          link: transaction.metadata.flwCheckoutLink,
          reference: transaction.transactionId,
          providerReference: transaction.metadata.flwReference || transaction.transactionId,
          status: transaction.status,
        },
      });
    }

    let checkout;
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const redirectUrl = new URL('/#/dashboard', frontendUrl).toString();
      const customerName = [req.body?.firstName, req.body?.lastName].filter(Boolean).join(' ').trim();
      checkout = await requestFlutterwave('/payments', {
        method: 'POST',
        body: {
          tx_ref: transaction.transactionId,
          amount,
          currency,
          redirect_url: redirectUrl,
          customer: {
            email: customerEmail,
            ...(customerName ? { name: customerName } : {}),
            ...(req.body?.phone ? { phonenumber: req.body.phone } : {}),
          },
          customizations: {
            title: 'JEGA Wallet Funding',
          },
        },
      });
      const checkoutUrl = new URL(checkout?.link);
      if (checkoutUrl.protocol !== 'https:' || checkoutUrl.hostname !== 'checkout.flutterwave.com') {
        throw new Error('Flutterwave returned an invalid checkout URL.');
      }

      const updated = await updateTransaction(transaction.transactionId, {
        metadata: {
          ...transaction.metadata,
          flwCheckoutLink: checkoutUrl.toString(),
        },
      });
      if (!updated) throw new Error('Could not save Flutterwave checkout details.');

      return res.json({
        success: true,
        message: 'Deposit initiated successfully.',
        data: {
          link: checkoutUrl.toString(),
          reference: transaction.transactionId,
          providerReference: checkout?.tx_ref || transaction.transactionId,
          status: updated.status,
        },
      });
    } catch (error) {
      if (error?.code === 'FLW_NOT_CONFIGURED') {
        return res.status(503).json({ message: 'Payment provider is not configured.' });
      }
      console.error('Flutterwave checkout request failed', {
        status: error?.status || null,
      });
      return res.status(502).json({ message: 'Unable to create a payment checkout. Please try again.' });
    }

  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        code: 'DUPLICATE_TRANSACTION_ID',
        message: 'Duplicate transactionId detected. This transaction has already been processed.',
      });
    }

    console.error('payment initiate error', error);
    return res.status(500).json({ message: 'Failed to initiate deposit.' });
  }
});

router.get('/transactions', verifyJwt, async (req, res) => {
  const customerId = req.user?.email;
  const transactions = await listCustomerTransactions(customerId);
  return res.json({ data: transactions });
});

router.post('/verify', verifyJwt, async (req, res) => {
  const transactionId = req.body?.tx_ref || req.body?.reference || req.body?.transactionId;
  const providerTransactionId =
    req.body?.providerTransactionId ||
    req.body?.flutterwaveTransactionId ||
    (req.body?.tx_ref ? req.body?.transactionId : null);
  if (!transactionId || !providerTransactionId) {
    return res.status(400).json({
      message: 'tx_ref and providerTransactionId are required.',
    });
  }

  const tx = await findTransactionById(transactionId);
  if (!tx || (tx.customerId !== req.user?.email && tx.metadata?.userEmail !== req.user?.email)) {
    return res.status(404).json({ message: 'Transaction not found.' });
  }

  if (tx.status === 'successful') {
    return res.json({ success: true, status: tx.status, data: tx });
  }
  if (tx.status !== 'pending') {
    return res.status(409).json({ success: false, status: tx.status, data: tx });
  }
  if (!/^\d+$/.test(String(providerTransactionId))) {
    return res.status(400).json({ message: 'Invalid providerTransactionId.' });
  }

  try {
    const providerTransaction = await requestFlutterwave(
      `/transactions/${encodeURIComponent(providerTransactionId)}/verify`
    );
    if (!matchesFlutterwaveTransaction(providerTransaction, tx, providerTransactionId)) {
      return res.status(409).json({
        success: false,
        code: 'PAYMENT_DETAILS_MISMATCH',
        message: 'Flutterwave payment details do not match this transaction.',
      });
    }

    const result = await settleVerifiedTransaction(tx, providerTransaction);
    return res.json({
      success: result.transaction?.status === 'successful',
      status: result.transaction?.status || tx.status,
      data: result.transaction || tx,
    });
  } catch (error) {
    if (error?.code === 'FLW_NOT_CONFIGURED') {
      return res.status(503).json({ message: 'Payment provider is not configured.' });
    }
    console.error('Flutterwave transaction verification failed', {
      status: error?.status || null,
    });
    return res.status(502).json({ message: 'Unable to verify payment with the provider.' });
  }
});

router.post('/webhook/flutterwave', async (req, res) => {
  const configuredHash = process.env.FLW_WEBHOOK_SECRET_HASH?.trim();
  if (!configuredHash) {
    return res.status(503).json({ message: 'Payment webhook is not configured.' });
  }
  if (!safeWebhookHashMatches(req.get('verif-hash'), configuredHash)) {
    return res.status(401).json({ message: 'Invalid webhook signature.' });
  }

  const payload = req.body || {};
  if (payload.event !== 'charge.completed') {
    return res.status(200).json({ received: true });
  }

  const transactionId = payload.data?.tx_ref;
  const providerTransactionId = payload.data?.id;
  if (!transactionId || !/^\d+$/.test(String(providerTransactionId || ''))) {
    return res.status(400).json({ message: 'Invalid payment webhook payload.' });
  }

  const tx = await findTransactionById(String(transactionId));
  if (!tx) {
    return res.status(200).json({ received: true });
  }
  if (tx.status !== 'pending') {
    return res.status(200).json({ received: true });
  }

  try {
    const providerTransaction = await requestFlutterwave(
      `/transactions/${encodeURIComponent(providerTransactionId)}/verify`
    );
    if (!matchesFlutterwaveTransaction(providerTransaction, tx, providerTransactionId)) {
      console.warn('Flutterwave webhook transaction details did not match local transaction.');
      return res.status(200).json({ received: true });
    }

    await settleVerifiedTransaction(tx, providerTransaction);
    return res.status(200).json({ received: true });
  } catch (error) {
    if (error?.code === 'FLW_NOT_CONFIGURED') {
      return res.status(503).json({ message: 'Payment provider is not configured.' });
    }
    console.error('Flutterwave webhook processing failed', {
      status: error?.status || null,
    });
    return res.status(500).json({ message: 'Webhook processing failed.' });
  }
});

router.get('/stats', verifyJwt, async (req, res) => {
  const customerId = req.user?.email;
  const transactions = await listCustomerTransactions(customerId);
  const totalTransactions = transactions.length;
  const totalAmount = transactions.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const successfulPayments = transactions.filter((item) => item.status === 'successful').length;
  const pendingPayments = transactions.filter((item) => item.status === 'pending_manual_review').length;
  return res.json({ data: { totalTransactions, totalAmount, successfulPayments, pendingPayments } });
});

router.get('/reviews/pending', requireAdmin, async (req, res) => {
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
  const items = await listPendingManualReviews(limit);
  return res.json({ data: items });
});

router.post('/reviews/:transactionId/approve', requireAdmin, async (req, res) => {
  const transactionId = req.params.transactionId;
  const reviewerNote = req.body?.reviewerNote || null;

  const tx = await updateReviewDecision({
    transactionId,
    decision: 'approved',
    reviewedBy: req.user?.email || 'admin',
    reviewerNote,
  });

  if (!tx) {
    return res.status(404).json({ message: 'Transaction not found.' });
  }

  auditRiskEvent('review_approved', {
    transactionId,
    reviewedBy: req.user?.email || 'admin',
  });

  return res.json({
    message: 'Transaction review approved.',
    data: tx,
  });
});

router.post('/reviews/:transactionId/reject', requireAdmin, async (req, res) => {
  const transactionId = req.params.transactionId;
  const reviewerNote = req.body?.reviewerNote || null;

  const tx = await updateReviewDecision({
    transactionId,
    decision: 'rejected',
    reviewedBy: req.user?.email || 'admin',
    reviewerNote,
  });

  if (!tx) {
    return res.status(404).json({ message: 'Transaction not found.' });
  }

  auditRiskEvent('review_rejected', {
    transactionId,
    reviewedBy: req.user?.email || 'admin',
  });

  return res.json({
    message: 'Transaction review rejected.',
    data: tx,
  });
});

router.get('/risk/events', requireAdmin, async (req, res) => {
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
  const userId = req.query.userId || undefined;
  const decision = req.query.decision || undefined;
  const events = await listRiskEvents({ limit, userId, decision });
  return res.json({ data: events });
});

router.get('/risk/config', requireAdmin, async (req, res) => {
  const config = await getRiskConfig();
  return res.json({ data: config });
});

router.get('/risk/state/:userId', requireAdmin, async (req, res) => {
  const state = await getUserRiskState(req.params.userId);
  return res.json({ data: state });
});

router.post('/risk/unblock', requireAdmin, async (req, res) => {
  const userId = req.body?.userId;
  if (!userId) return res.status(400).json({ message: 'userId is required.' });
  const state = await unblockUser(userId);
  return res.json({ message: 'User unblocked successfully.', data: state });
});

router.post('/risk/allowlist', requireAdmin, async (req, res) => {
  const userId = req.body?.userId;
  const allow = Boolean(req.body?.allow);
  if (!userId) return res.status(400).json({ message: 'userId is required.' });
  const state = await setAllowlist(userId, allow);
  return res.json({ message: allow ? 'User added to allowlist.' : 'User removed from allowlist.', data: state });
});

module.exports = router;
