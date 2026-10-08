const mongoose = require('mongoose');

/**
 * Electricity Transaction Schema
 * Stores electricity bill payment records
 */
const electricityTransactionSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    transactionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    billerName: {
      type: String,
      required: true,
      index: true,
    },
    meterNumber: {
      type: String,
      required: true,
    },
    customerName: {
      type: String,
      default: null,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    phone: {
      type: String,
      required: true,
    },
    token: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'successful', 'failed', 'processing'],
      default: 'pending',
      index: true,
    },
    reference: {
      type: String,
      default: null,
      index: true,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'electricityTransactions',
  }
);

module.exports = mongoose.models.ElectricityTransaction ||
  mongoose.model('ElectricityTransaction', electricityTransactionSchema);
