// Manually run the transcribe+score pipeline over pending submissions.
//   node scripts/run-scorer.js
require('dotenv').config();
const { pool } = require('../src/db');
const { runScorer } = require('../src/scoring/run');

(async () => {
  try {
    const results = await runScorer(20);
    console.log(JSON.stringify(results, null, 2));
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
