// Mongo shell script for riskevents.transactionId uniqueness migration
// Usage examples:
//   mongosh "mongodb://localhost:27017/jega" backend/scripts/riskEventsTransactionIdIndex.mongo.js
// Optional shell vars:
//   var collectionName = 'riskevents';
//   var strategy = 'update'; // 'update' | 'remove'

const collectionName = typeof collectionName === 'string' ? collectionName : 'riskevents';
const strategy = typeof strategy === 'string' ? strategy : 'update';
const coll = db.getCollection(collectionName);

print(`Using collection: ${collectionName}`);

// 1) Detect duplicates and report them (required query)
const duplicates = coll
  .aggregate([
    { $group: { _id: '$transactionId', count: { $sum: 1 }, ids: { $push: '$_id' } } },
    { $match: { _id: { $ne: null }, count: { $gt: 1 } } },
  ])
  .toArray();

print('Duplicate transactionId groups found: ' + duplicates.length);
if (duplicates.length > 0) {
  printjson(duplicates);
}

if (duplicates.length > 0) {
  print(`Running dedup strategy: ${strategy}`);

  duplicates.forEach((dup) => {
    const tx = dup._id;
    const docs = coll
      .find({ transactionId: tx })
      .sort({ createdAt: 1, _id: 1 })
      .toArray();

    if (docs.length < 2) return;

    const keep = docs[0]; // keep earliest document
    const extras = docs.slice(1);

    print(`Keeping _id=${keep._id} for transactionId=${tx}; handling ${extras.length} duplicates`);

    extras.forEach((doc, idx) => {
      if (strategy === 'remove') {
        coll.deleteOne({ _id: doc._id });
      } else {
        const replacement = `${tx}__dedup_${idx + 1}_${doc._id}`;
        coll.updateOne(
          { _id: doc._id },
          { $set: { transactionId: replacement, migrationNote: `deduped from ${tx}` } }
        );
      }
    });
  });
}

// Backfill missing transactionId values from depositId where possible
const backfill = coll.updateMany(
  { $or: [{ transactionId: null }, { transactionId: { $exists: false } }], depositId: { $exists: true, $ne: null } },
  [{ $set: { transactionId: '$depositId' } }]
);
print('Backfilled transactionId from depositId:');
printjson(backfill);

// 2) Re-check duplicates before index creation
const postCheck = coll
  .aggregate([
    { $group: { _id: '$transactionId', count: { $sum: 1 }, ids: { $push: '$_id' } } },
    { $match: { _id: { $ne: null }, count: { $gt: 1 } } },
  ])
  .toArray();

if (postCheck.length > 0) {
  print('Duplicate transactionId values still exist. Resolve and rerun.');
  printjson(postCheck);
  quit(1);
}

// 3) Create unique index (required command)
const indexResult = coll.createIndex(
  { transactionId: 1 },
  { unique: true, name: `ux_${collectionName}_transactionId` }
);
print('Created index: ' + indexResult);

print('Final indexes:');
printjson(coll.getIndexes());
