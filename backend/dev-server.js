// Local development server. On Vercel the Express app is served via api/index.js.
require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`[backend] listening on http://localhost:${PORT}`);
  console.log(`[backend] health: http://localhost:${PORT}/api/health`);
});
