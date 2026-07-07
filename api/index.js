// Vercel serverless entry for the single-project deploy.
// Lives at the repo root so Vercel serves it at /api; the vercel.json rewrite
// forwards every /api/* request here, where the Express app routes it.
module.exports = require('../backend/src/app');
