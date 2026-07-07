// Central env config. Fails fast in production so a misconfigured deploy
// surfaces at boot instead of as forgeable sessions or open endpoints.

const IS_PROD = !!process.env.VERCEL || process.env.NODE_ENV === 'production';

const POSTGRES_URL =
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  '';

const SESSION_SECRET = process.env.SESSION_SECRET || '';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const CRON_SECRET = process.env.CRON_SECRET || '';

if (IS_PROD) {
  const missing = [];
  if (!SESSION_SECRET) missing.push('SESSION_SECRET');
  if (!POSTGRES_URL) missing.push('POSTGRES_URL');
  if (!GOOGLE_CLIENT_ID) missing.push('GOOGLE_CLIENT_ID');
  if (missing.length) {
    throw new Error(`Refusing to start in production without: ${missing.join(', ')}`);
  }
  if (!CRON_SECRET) {
    console.warn('[config] CRON_SECRET not set — /api/cron/score will reject all requests');
  }
}

module.exports = {
  IS_PROD,
  POSTGRES_URL,
  GOOGLE_CLIENT_ID,
  CRON_SECRET,
  // Dev keeps a fallback so `npm run dev` works out of the box; production
  // never reaches this branch (boot fails above).
  SESSION_SECRET: SESSION_SECRET || 'dev-insecure-secret-change-me',
  ADMIN_EMAILS: (process.env.ADMIN_EMAILS || 'ashish@openhouse.in')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  FRONTEND_ORIGINS: (process.env.FRONTEND_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  // Whisper rejects files over 25 MB — keep every layer aligned with that.
  MAX_AUDIO_BYTES: 25 * 1024 * 1024,
};
