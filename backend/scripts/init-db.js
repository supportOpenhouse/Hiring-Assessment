// Create tables. Run once (locally or against your Vercel Postgres):
//   POSTGRES_URL=... node scripts/init-db.js
//
// To recreate from scratch (drops all data — dev only):
//   RESET_OK=1 POSTGRES_URL=... node scripts/init-db.js --reset
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/db');

const TABLES = [
  'scores', 'recordings', 'bd_calls', 'market_negotiations',
  'market_prices', 'market_plans', 'market_configs', 'submissions', 'users',
];

(async () => {
  const reset = process.argv.includes('--reset');
  try {
    if (reset) {
      if (process.env.RESET_OK !== '1') {
        console.error('✗ --reset drops all tables. Re-run with RESET_OK=1 to confirm.');
        process.exit(1);
      }
      await pool.query(`drop table if exists ${TABLES.join(', ')} cascade`);
      console.log('✓ dropped existing tables');
    }
    const sql = fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8');
    await pool.query(sql);
    console.log('✓ schema applied');
  } catch (e) {
    console.error('✗ schema failed:', e.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
