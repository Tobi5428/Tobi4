const { Pool } = require('pg');

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();

  if (['true', '1', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['false', '0', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return fallback;
}

function getConnectionString() {
  const directConnectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (directConnectionString && directConnectionString.trim()) {
    return directConnectionString.trim();
  }

  const { PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE } = process.env;
  if (PGHOST && PGUSER && PGDATABASE) {
    const port = PGPORT || '5432';
    const password = PGPASSWORD ? `:${encodeURIComponent(PGPASSWORD)}` : '';
    return `postgresql://${encodeURIComponent(PGUSER)}${password}@${PGHOST}:${port}/${PGDATABASE}`;
  }

  return null;
}

function getSslConfig() {
  const sslExplicit = parseBoolean(process.env.PGSSL, null);
  if (sslExplicit === true) {
    return { rejectUnauthorized: false };
  }

  if (sslExplicit === false) {
    return false;
  }

  if (process.env.NODE_ENV === 'production') {
    return { rejectUnauthorized: false };
  }

  return false;
}

function createPool() {
  const connectionString = getConnectionString();
  if (!connectionString) {
    console.warn('[PostgreSQL] No database connection string configured. Set DATABASE_URL (or PGHOST/PGUSER/PGDATABASE) in backend/.env or the repository-root .env to enable PostgreSQL access.');
    return null;
  }

  const sslConfig = getSslConfig();
  const poolOptions = {
    connectionString,
    ...(sslConfig ? { ssl: sslConfig } : {}),
  };

  const pool = new Pool(poolOptions);

  pool.on('error', (err) => {
    console.error('[PostgreSQL] Unexpected pool error:', err);
  });

  return pool;
}

const pool = createPool();

async function connectPostgres() {
  if (!pool) {
    return null;
  }

  let client;
  try {
    client = await pool.connect();
    await client.query('SELECT 1');
    console.log('[PostgreSQL] Connected successfully');
    return pool;
  } catch (err) {
    console.error('[PostgreSQL] Connection error:', err.message || err);
    return null;
  } finally {
    if (client) {
      client.release();
    }
  }
}

async function testPostgresConnection() {
  if (!pool) {
    return false;
  }

  let client;
  try {
    client = await pool.connect();
    const result = await client.query('SELECT 1 AS ok');
    return result.rows[0]?.ok === 1;
  } catch (err) {
    console.error('[PostgreSQL] Test query failed:', err.message || err);
    return false;
  } finally {
    if (client) {
      client.release();
    }
  }
}

module.exports = {
  pool,
  connectPostgres,
  testPostgresConnection,
};
