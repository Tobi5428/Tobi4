// Backfill script for transactions IP/device risk review fields
// Usage:
//   mongosh "mongodb://localhost:27017/jega" backend/scripts/transactionsRiskBackfill.mongo.js

const coll = db.getCollection('transactions');

print('Backfilling required transaction risk fields...');

const result = coll.updateMany(
  {},
  [
    {
      $set: {
        customerId: { $ifNull: ['$customerId', '$email'] },
        customerIp: { $ifNull: ['$customerIp', 'unknown'] },
        deviceFingerprint: { $ifNull: ['$deviceFingerprint', 'missing'] },
        riskFlags: { $ifNull: ['$riskFlags', []] },
        reviewStatus: { $ifNull: ['$reviewStatus', 'none'] },
        reviewReason: { $ifNull: ['$reviewReason', null] },
        updatedAt: { $ifNull: ['$updatedAt', new Date()] },
        createdAt: { $ifNull: ['$createdAt', new Date()] },
      },
    },
  ]
);

print('Backfill result:');
printjson(result);

print('Ensuring required indexes...');
printjson(
  coll.createIndex({ customerId: 1, createdAt: -1 }, { name: 'ix_transactions_customer_createdAt' })
);
printjson(
  coll.createIndex({ customerId: 1, customerIp: 1 }, { name: 'ix_transactions_customer_customerIp' })
);
printjson(
  coll.createIndex({ reviewStatus: 1, createdAt: -1 }, { name: 'ix_transactions_reviewStatus_createdAt' })
);

print('Done.');
