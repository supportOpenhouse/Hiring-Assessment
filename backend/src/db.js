const { Pool } = require('pg');
const { POSTGRES_URL } = require('./config');

// Vercel Postgres / Neon both expose POSTGRES_URL and present valid public-CA
// certificates, so TLS is verified by default. Local Postgres skips SSL.
// PGSSL_NO_VERIFY=1 is the escape hatch for providers with self-signed certs.
const isLocal = /localhost|127\.0\.0\.1/.test(POSTGRES_URL);
const ssl = isLocal
  ? false
  : process.env.PGSSL_NO_VERIFY === '1'
    ? { rejectUnauthorized: false }
    : { rejectUnauthorized: true };

const pool = new Pool({
  connectionString: POSTGRES_URL,
  ssl,
  max: 3, // serverless: keep the pool small
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 30_000,
  statement_timeout: 15_000,
});

// Without this, an idle client dropped by the server crashes the process.
pool.on('error', (err) => {
  console.error('[db] idle client error:', err.message);
});

async function query(text, params) {
  return pool.query(text, params);
}

// Convenience: run a query and return the first row (or null).
async function one(text, params) {
  const { rows } = await pool.query(text, params);
  return rows[0] || null;
}

async function many(text, params) {
  const { rows } = await pool.query(text, params);
  return rows;
}

module.exports = { pool, query, one, many };
