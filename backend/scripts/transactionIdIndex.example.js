/*
Node.js examples for transactionId unique index definition and idempotent write path
*/

// ---- Mongoose schema/index example ----
// const mongoose = require('mongoose');
//
// const schema = new mongoose.Schema({
//   transactionId: { type: String, required: true },
//   amount: Number,
//   createdAt: { type: Date, default: Date.now },
// });
//
// schema.index(
//   { transactionId: 1 },
//   { unique: true, name: 'ux_riskevents_transactionId' }
// );
//
// const RiskEvent = mongoose.model('RiskEvent', schema);
//
// async function writeIdempotent(event) {
//   return RiskEvent.findOneAndUpdate(
//     { transactionId: event.transactionId },
//     { $setOnInsert: event },
//     { upsert: true, new: true, runValidators: true }
//   );
// }

// ---- MongoDB native driver example ----
// const { MongoClient } = require('mongodb');
//
// async function run() {
//   const client = new MongoClient(process.env.MONGO_URI);
//   await client.connect();
//   const db = client.db('jega');
//   const coll = db.collection('riskevents');
//
//   await coll.createIndex(
//     { transactionId: 1 },
//     { unique: true, name: 'ux_riskevents_transactionId' }
//   );
//
//   const tx = 'txn-123';
//   const doc = { transactionId: tx, amount: 1000, createdAt: new Date() };
//
//   // Idempotent upsert by transactionId
//   const result = await coll.findOneAndUpdate(
//     { transactionId: tx },
//     { $setOnInsert: doc },
//     { upsert: true, returnDocument: 'after' }
//   );
//
//   console.log(result.value);
//   await client.close();
// }
//
// run().catch(console.error);
