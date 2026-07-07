const { Pool } = require('pg');

// Vercel Postgres / Neon both expose POSTGRES_URL. Neon requires SSL.
const connectionString =
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL;

const pool = new Pool({
  connectionString,
  ssl: connectionString && /localhost|127\.0\.0\.1/.test(connectionString)
    ? false
    : { rejectUnauthorized: false },
  max: 3, // serverless: keep the pool small
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
