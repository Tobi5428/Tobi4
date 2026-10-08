# Backend demo (Nodemailer flows)

This minimal Express backend demonstrates Nodemailer-based flows for:
- Forgot / Reset password
- Email-change confirmation (settings)
- Login OTP verification
- Google reCAPTCHA v3 signup verification

Quick start:

1. Copy `.env.example` to `backend/.env` and configure the required settings. The backend also loads the repository-root `.env` as a fallback; values in `backend/.env` take precedence.
2. Install dependencies:

```bash
cd backend
npm install
```

3. Run the server:

```bash
npm start
```

Routes:
- POST `/auth/register` { firstName, lastName, phone, email, password, recaptchaToken }
- POST `/auth/login` { email, password }
- POST `/auth/verify-login-otp` { challengeId, otp }
- POST `/auth/resend-login-otp` { challengeId }
- POST `/auth/forgot-password` { email }
- POST `/auth/reset-password` { email, token, password }
- POST `/auth/request-email-change` { currentEmail, newEmail }
- POST `/auth/confirm-email-change` { currentEmail, newEmail, token }

Set `VITE_RECAPTCHA_SITE_KEY` in the repository-root `.env` or `.env.local` file for the frontend. Set `RECAPTCHA_SECRET_KEY` in `backend/.env`; this key must never be exposed to Vite or the browser. `RECAPTCHA_MIN_SCORE` is optional and defaults to `0.5`. Signup is rejected if Google verification fails, the action is not `signup`, or the score is below the configured threshold. Login and OTP verification do not use reCAPTCHA.

For PostgreSQL, set `DATABASE_URL` (or `POSTGRES_URL`), or set `PGHOST`, `PGUSER`, and `PGDATABASE` together. The database name in the URL/path or `PGDATABASE` must exactly match an existing PostgreSQL database; PostgreSQL database names are case-sensitive.

## Deposit Risk Controls

The backend now includes a real-time deposit risk engine on payment initiation.

### Deposit endpoints

- POST `/payment/initiate`
- POST `/payment/verify`
- GET `/payment/transactions`
- GET `/payment/stats`

### Risk admin endpoints

- GET `/payment/risk/events?limit=50&userId=<id>&decision=BLOCK`
- GET `/payment/risk/config`
- GET `/payment/risk/state/:userId`
- POST `/payment/risk/unblock` { userId }
- POST `/payment/risk/allowlist` { userId, allow }

These endpoints require admin authorization. A request is treated as admin when:

- JWT payload has `role: "admin"`, or
- JWT email exists in `ADMIN_EMAILS` environment variable.

### Decision outcomes

- `ALLOW`: continues to payment processing.
- `REVIEW`: returns 202 with `RISK_REVIEW_REQUIRED`.
- `BLOCK`: returns 403 with `HIGH_RISK_BLOCK`.

### Tunable configuration

Configure via environment variables (or `RiskRuleConfig` DB rows if Mongo is connected):

- `CARD_COUNT_WINDOW_1H`, `CARD_COUNT_WINDOW_24H`
- `DEPOSIT_COUNT_WINDOW_5M`, `DEPOSIT_COUNT_WINDOW_10M`
- `DECLINE_WINDOW_15M`
- `BLOCK_THRESHOLD`, `REVIEW_THRESHOLD`
- `AMOUNT_THRESHOLD_1H`, `AMOUNT_THRESHOLD_24H`
- `TEMP_BLOCK_HOURS`
- `WEIGHT_MULTI_CARD_VELOCITY`
- `WEIGHT_RAPID_REPEAT_DEPOSITS`
- `WEIGHT_EXCESSIVE_DECLINES`
- `WEIGHT_AMOUNT_PATTERN_ANOMALY`
- `WEIGHT_DEVICE_LINK_RISK`

### Notes

- Idempotent retries are supported with `Idempotency-Key` header.
- The service uses per-user request locking to prevent race-condition bypasses.
- Mongo is optional; in-memory fallback is used in demo mode.

## transactionId Unique Index (Risk Events)

Target collection: `riskevents`.

### Create unique index

```javascript
db.riskevents.createIndex(
	{ transactionId: 1 },
	{ unique: true, name: "ux_riskevents_transactionId" }
)
```

### Detect duplicates before index creation

```javascript
db.riskevents.aggregate([
	{ $group: { _id: "$transactionId", count: { $sum: 1 }, ids: { $push: "$_id" } } },
	{ $match: { _id: { $ne: null }, count: { $gt: 1 } } }
])
```

### Safe migration strategy when duplicates exist

1. Keep earliest document per `transactionId` (sort by `createdAt`, then `_id`).
2. For duplicates:
	 - update duplicate `transactionId` values to deduped values, or
	 - remove duplicates if your retention policy allows deletion.
3. Backfill missing `transactionId` from `depositId` where available.
4. Re-run duplicate check.
5. Re-run index creation.

Provided script:

- Mongo shell migration: `backend/scripts/riskEventsTransactionIdIndex.mongo.js`
- Node.js examples: `backend/scripts/transactionIdIndex.example.js`

### Idempotent write path

Risk-event writes use upsert by `transactionId` with `$setOnInsert`, so repeated writes with the same transaction ID do not create duplicate documents.

### Duplicate key handling (E11000)

On duplicate key conflicts, API returns clean app response:

- HTTP `409`
- code: `DUPLICATE_TRANSACTION_ID`
- message: duplicate transaction already processed.

### Rollback steps if migration fails

1. Drop the new index if partially created:

```javascript
db.riskevents.dropIndex("ux_riskevents_transactionId")
```

2. If you used update strategy, revert updated duplicate IDs using your backup/snapshot.
3. If you used remove strategy, restore removed docs from backup.
4. Re-run duplicate detection query to verify baseline state.
5. Fix migration logic and rerun script in a staging environment before production.

This demo uses an in-memory user store — replace with your DB in production.

## IP & Device Fingerprint Risk Review Flow

Every payment attempt stores risk-tracking fields in the `transactions` collection:

- `customerId`
- `customerIp`
- `deviceFingerprint`
- `riskFlags`
- `reviewStatus`
- `reviewReason`
- `reviewedBy`, `reviewedAt`, `reviewerNote`

### Transaction indexes

- `{ customerId: 1, createdAt: -1 }`
- `{ customerId: 1, customerIp: 1 }`
- `{ reviewStatus: 1, createdAt: -1 }`

### IP extraction behavior

- If `TRUST_PROXY=true`, app reads first IP from `IP_HEADER_NAME` header.
- If `TRUST_PROXY=false`, forwarding header is ignored and socket remote address is used.
- IPv6-mapped IPv4 values like `::ffff:10.0.0.1` are normalized to `10.0.0.1`.

### Device fingerprint behavior

- Reads from header `X-Device-Fingerprint` or request body fingerprint fields.
- Invalid/missing values trigger `MISSING_DEVICE_FINGERPRINT` risk flag.

### New IP risk rule

- If `ENABLE_IP_RISK_RULE=true` and customer IP has never been seen for `customerId`, transaction is flagged:
	- `riskFlags` includes `NEW_IP_ADDRESS`
	- `reviewStatus = manual_review_required`
	- `reviewReason = New IP address detected for customer`

Payment creation still succeeds, but response message is non-sensitive:

- `Transaction submitted and pending manual review.`

### Manual review admin endpoints

- `GET /payment/reviews/pending`
- `POST /payment/reviews/:transactionId/approve` with `{ reviewerNote }`
- `POST /payment/reviews/:transactionId/reject` with `{ reviewerNote }`

### Audit logging

- Risk decisions and review actions are logged with structured audit events in server logs.

### Data retention and privacy guidance

- Retain IP and device-fingerprint data only for risk/compliance windows defined by policy.
- Use `HASH_CUSTOMER_IP=true` when policy requires anonymized stored IP values.
- If hashing is enabled, ensure review tooling and detection logic consistently uses hashed values.

### Migration/backfill script

- `backend/scripts/transactionsRiskBackfill.mongo.js`
	- backfills required fields on existing transactions
	- creates required risk review indexes
