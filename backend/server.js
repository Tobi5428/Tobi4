const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { pool, connectPostgres, testPostgresConnection } = require('./db');
const authRoutes = require('./routes/auth');
const notificationsRoutes = require('./routes/notifications');
const paymentRoutes = require('./routes/payment');
const accountLimitsRoutes = require('./routes/accountLimits');
const transactionPinRoutes = require('./routes/transactionPin');
const referralRoutes = require('./routes/referral');
const electricityRoutes = require('./routes/electricity');
const verifyJwt = require('./middleware/verifyJwt');

const app = express();

app.use(express.json());
app.use(cors({
	origin: process.env.FRONTEND_URL || 'http://localhost:5173',
	credentials: true,
}));

async function connectMongo() {
	const mongoUri = process.env.MONGO_URI;
	if (!mongoUri) {
		console.log('MONGO_URI not set — skipping MongoDB connection (using demo in-memory store)');
		return;
	}

	try {
		await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
		console.log('Connected to MongoDB');
	} catch (err) {
		console.error('MongoDB connection error:', err);
	}
}

async function connectDatabases() {
	await connectMongo();
	await connectPostgres();
}

// Mount routes
app.use('/auth', authRoutes);
app.use('/notifications', notificationsRoutes);
app.use('/payment', paymentRoutes);
app.use('/account-limits', accountLimitsRoutes);
app.use('/transaction-pin', transactionPinRoutes);
app.use('/referral', referralRoutes);
app.use('/electricity', electricityRoutes);

// Example protected route
app.get('/protected', verifyJwt, (req, res) => {
	res.json({ ok: true, user: req.user });
});

app.get('/api/health/db', async (req, res) => {
	const mongoConnected = mongoose.connection.readyState === 1;
	const postgresConnected = await testPostgresConnection();

	res.json({
		timestamp: new Date().toISOString(),
		mongodb: {
			connected: mongoConnected,
			status: mongoose.connection.readyState,
		},
		postgresql: {
			connected: postgresConnected,
			enabled: Boolean(pool),
		},
	});
});

app.get('/', (req, res) => res.json({ ok: true }));

async function startServer() {
	await connectDatabases();
	const port = Number(process.env.PORT) || 5000;
	app.listen(port, () => console.log(`Server listening on port ${port}`));
}

if (require.main === module) {
	startServer();
}

module.exports = {
	app,
	connectMongo,
	connectDatabases,
	connectPostgres,
	startServer,
	pool,
};
