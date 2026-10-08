const express = require('express');
const crypto = require('crypto');
const mongoose = require('mongoose');
const verifyJwt = require('../middleware/verifyJwt');
const ElectricityTransaction = require('../models/ElectricityTransaction');

const router = express.Router();

function canUseMongo() {
  return mongoose.connection.readyState === 1;
}

// Mock electricity billers database
// In production, this would come from an external provider (Payarena, Flutterwave, etc.)
const ELECTRICITY_BILLERS = [
  {
    id: 1,
    item_code: 'EKEDC',
    name: 'Eko Electricity Distribution Company',
    biller_name: 'EKEDC',
  },
  {
    id: 2,
    item_code: 'IKEDC',
    name: 'Ikeja Electricity Distribution Company',
    biller_name: 'IKEDC',
  },
  {
    id: 3,
    item_code: 'KEDCO',
    name: 'Kano Electricity Distribution Company',
    biller_name: 'KEDCO',
  },
  {
    id: 4,
    item_code: 'PHEDC',
    name: 'Port Harcourt Electricity Distribution Company',
    biller_name: 'PHEDC',
  },
  {
    id: 5,
    item_code: 'ABUJA',
    name: 'Abuja Electricity Distribution Company',
    biller_name: 'AEDC',
  },
];

// Mock customer database - in production, this would be via API
const MOCK_CUSTOMERS = {
  'EKEDC-12345678': {
    name: 'John Doe',
    address: '25 Allen Avenue, Ikeja',
    meterNumber: '12345678',
  },
  'IKEDC-87654321': {
    name: 'Jane Smith',
    address: '10 Victoria Island, Lagos',
    meterNumber: '87654321',
  },
  'KEDCO-11223344': {
    name: 'Ahmed Hassan',
    address: 'Kano Town Center',
    meterNumber: '11223344',
  },
};

/**
 * GET /electricity/billers
 * Get list of electricity providers
 */
router.get('/billers', verifyJwt, (req, res) => {
  try {
    return res.json({
      ok: true,
      billers: ELECTRICITY_BILLERS,
    });
  } catch (err) {
    console.error('[Electricity] Error fetching billers:', err);
    return res.status(500).json({
      ok: false,
      message: 'Error fetching billers',
    });
  }
});

/**
 * POST /electricity/verify-meter
 * Verify meter number and get customer details
 * Body: { itemCode: "EKEDC", meterNumber: "12345678" }
 */
router.post('/verify-meter', verifyJwt, async (req, res) => {
  try {
    const { itemCode, meterNumber } = req.body || {};

    if (!itemCode || !meterNumber) {
      return res.status(400).json({
        ok: false,
        message: 'Item code and meter number required',
      });
    }

    // Validate biller
    const biller = ELECTRICITY_BILLERS.find((b) => b.item_code === itemCode);
    if (!biller) {
      return res.status(404).json({
        ok: false,
        message: 'Invalid electricity provider',
      });
    }

    // Mock meter verification - in production, call actual provider API
    const mockKey = `${itemCode}-${meterNumber}`;
    const customer = MOCK_CUSTOMERS[mockKey];

    if (!customer) {
      // For demo: generate fake customer for any meter
      return res.json({
        ok: true,
        meterNumber,
        customerName: 'Demo Customer ' + meterNumber,
        address: 'Demo Address, Nigeria',
        verified: true,
      });
    }

    return res.json({
      ok: true,
      meterNumber: customer.meterNumber,
      customerName: customer.name,
      address: customer.address,
      verified: true,
    });
  } catch (err) {
    console.error('[Electricity] Error verifying meter:', err);
    return res.status(500).json({
      ok: false,
      message: 'Error verifying meter number',
    });
  }
});

/**
 * POST /electricity/purchase
 * Purchase electricity credits
 * Body: { billerType: "EKEDC", meterNumber: "12345678", amount: 10000, phone: "08012345678" }
 */
router.post('/purchase', verifyJwt, async (req, res) => {
  try {
    const email = req.user?.email;
    const { billerType, meterNumber, amount, phone } = req.body || {};

    if (!email) {
      return res.status(401).json({ ok: false, message: 'User email not found in token' });
    }

    if (!billerType || !meterNumber || !amount || !phone) {
      return res.status(400).json({
        ok: false,
        message: 'Missing required fields: billerType, meterNumber, amount, phone',
      });
    }

    if (amount < 1000 || amount > 100000) {
      return res.status(400).json({
        ok: false,
        message: 'Amount must be between ₦1,000 and ₦100,000',
      });
    }

    // Validate biller
    const biller = ELECTRICITY_BILLERS.find((b) => b.item_code === billerType);
    if (!biller) {
      return res.status(404).json({
        ok: false,
        message: 'Invalid electricity provider',
      });
    }

    if (!canUseMongo()) {
      // Generate token for demo
      const token = crypto.randomBytes(8).toString('hex').toUpperCase();
      return res.json({
        ok: true,
        message: 'Electricity purchase successful',
        token,
        reference: `EL_${Date.now()}`,
        amount,
      });
    }

    // Generate transaction ID
    const transactionId = `EL_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const token = crypto.randomBytes(8).toString('hex').toUpperCase();

    // Record transaction
    await ElectricityTransaction.create({
      email,
      transactionId,
      billerName: biller.biller_name,
      meterNumber,
      customerName: req.body.customerName || 'Customer',
      amount,
      phone,
      token,
      status: 'successful',
      reference: transactionId,
    });

    console.log('[Electricity] Purchase successful:', {
      user: email,
      provider: billerType,
      meterNumber,
      amount,
      token,
    });

    return res.json({
      ok: true,
      message: 'Electricity purchase successful',
      token,
      reference: transactionId,
      amount,
      biller: biller.biller_name,
      meterNumber,
    });
  } catch (err) {
    console.error('[Electricity] Error processing purchase:', err);
    return res.status(500).json({
      ok: false,
      message: 'Error processing electricity purchase',
    });
  }
});

/**
 * GET /electricity/history
 * Get user's electricity purchase history
 */
router.get('/history', verifyJwt, async (req, res) => {
  try {
    const email = req.user?.email;

    if (!email) {
      return res.status(401).json({ ok: false, message: 'User email not found in token' });
    }

    if (!canUseMongo()) {
      return res.json({ ok: true, transactions: [] });
    }

    const transactions = await ElectricityTransaction.find({ email })
      .sort({ createdAt: -1 })
      .limit(50);

    return res.json({
      ok: true,
      transactions,
    });
  } catch (err) {
    console.error('[Electricity] Error fetching history:', err);
    return res.status(500).json({
      ok: false,
      message: 'Error fetching electricity history',
    });
  }
});

module.exports = router;
