// Vercel serverless entry — all /api/* requests are rewritten here (see vercel.json)
// and handled by the Express app.
const app = require('../src/app');
module.exports = app;
