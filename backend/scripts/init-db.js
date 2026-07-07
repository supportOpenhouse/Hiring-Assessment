// Create tables. Run once (locally or against your Vercel Postgres):
//   POSTGRES_URL=... node scripts/init-db.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/db');

(async () => {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8');
  try {
    await pool.query(sql);
    console.log('✓ schema applied');
  } catch (e) {
    console.error('✗ schema failed:', e.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
