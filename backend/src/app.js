const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const { handleUpload } = require('@vercel/blob/client');
const { del: deleteBlob } = require('@vercel/blob');

const config = require('./config');
const { one, many, query } = require('./db');
const auth = require('./auth');
const v = require('./validate');
const {
  ASSIGNMENT_TYPES, TABLES,
  getOrCreateSubmission, getBundle, updateSubmissionFields, insertRow, deleteRow,
} = require('./data');
const { runScorer } = require('./scoring/run');

const app = express();

app.disable('x-powered-by');
// Vercel terminates TLS and sets x-forwarded-for; trust it so req.ip is real.
app.set('trust proxy', true);

app.use(cors({ origin: config.FRONTEND_ORIGINS.includes('*') ? true : config.FRONTEND_ORIGINS }));
app.use(express.json({ limit: '2mb' }));

// API responses carry per-user data and must never be cached or sniffed.
app.use('/api', (req, res, next) => {
  res.set({
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
  });
  next();
});

// Minimal fixed-window per-IP rate limiter. Per-instance on serverless, which
// still bounds abuse per warm lambda without external state.
function rateLimit({ windowMs = 60_000, max = 30 } = {}) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    if (hits.size > 5000) {
      for (const [k, h] of hits) if (h.reset <= now) hits.delete(k);
    }
    const key = req.ip || 'unknown';
    let h = hits.get(key);
    if (!h || h.reset <= now) {
      h = { count: 0, reset: now + windowMs };
      hits.set(key, h);
    }
    h.count += 1;
    if (h.count > max) {
      res.set('Retry-After', String(Math.ceil((h.reset - now) / 1000)));
      return res.status(429).json({ error: 'Too many requests — try again shortly' });
    }
    next();
  };
}

const wrap = (fn) => (req, res, next) => fn(req, res).catch(next);

function checkType(req, res) {
  if (!ASSIGNMENT_TYPES.includes(req.params.type)) {
    res.status(404).json({ error: 'Unknown assignment' });
    return false;
  }
  return true;
}

const LOCKED_STATUSES = ['submitted', 'scoring', 'scored'];

// ---- Meta ----
app.get('/api/health', wrap(async (req, res) => {
  try {
    await query('select 1');
    res.json({ ok: true, db: true });
  } catch (e) {
    console.error('[health] db check failed:', e.message);
    res.status(503).json({ ok: false, db: false });
  }
}));
app.get('/api/config', (req, res) => res.json({ googleClientId: auth.GOOGLE_CLIENT_ID || null }));

// ---- Auth ----
app.post('/api/auth/google', rateLimit({ max: 10 }), wrap(async (req, res) => {
  const { idToken } = req.body || {};
  if (!idToken || typeof idToken !== 'string') return res.status(400).json({ error: 'Missing idToken' });
  let profile;
  try {
    profile = await auth.verifyGoogleIdToken(idToken);
  } catch (e) {
    return res.status(401).json({ error: 'Google sign-in could not be verified' });
  }
  const user = await auth.upsertUser(profile);
  const token = auth.issueSession(user);
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, picture: user.picture, role: user.role } });
}));

app.get('/api/me', auth.requireAuth, wrap(async (req, res) => {
  const user = await one(`select id, email, name, picture, role from users where id = $1`, [req.user.uid]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
}));

// ---- Candidate tracker ----
app.get('/api/submission/:type', auth.requireAuth, wrap(async (req, res) => {
  if (!checkType(req, res)) return;
  const sub = await getOrCreateSubmission(req.user.uid, req.params.type);
  const bundle = await getBundle(sub.id, req.params.type);
  // Candidates should not see their own score.
  if (req.user.role !== 'admin') bundle.score = null;
  res.json(bundle);
}));

app.put('/api/submission/:type', auth.requireAuth, wrap(async (req, res) => {
  if (!checkType(req, res)) return;
  const sub = await getOrCreateSubmission(req.user.uid, req.params.type);
  if (LOCKED_STATUSES.includes(sub.status)) {
    return res.status(409).json({ error: 'Already submitted — locked for editing' });
  }
  const updated = await updateSubmissionFields(sub.id, req.body || {});
  res.json({ submission: updated });
}));

app.post('/api/submission/:type/rows/:table', auth.requireAuth, wrap(async (req, res) => {
  if (!checkType(req, res)) return;
  const table = req.params.table;
  if (!TABLES[table] || TABLES[table].type !== req.params.type) {
    return res.status(400).json({ error: 'Invalid table for this assignment' });
  }
  const sub = await getOrCreateSubmission(req.user.uid, req.params.type);
  if (LOCKED_STATUSES.includes(sub.status)) {
    return res.status(409).json({ error: 'Already submitted — locked for editing' });
  }
  const row = await insertRow(sub.id, table, req.body || {});
  res.json({ row });
}));

app.delete('/api/submission/:type/rows/:table/:id', auth.requireAuth, wrap(async (req, res) => {
  if (!checkType(req, res)) return;
  const table = req.params.table;
  if (!TABLES[table] || TABLES[table].type !== req.params.type) {
    return res.status(400).json({ error: 'Invalid table' });
  }
  const sub = await getOrCreateSubmission(req.user.uid, req.params.type);
  if (LOCKED_STATUSES.includes(sub.status)) {
    return res.status(409).json({ error: 'Already submitted — locked' });
  }
  await deleteRow(sub.id, table, req.params.id);
  res.json({ ok: true });
}));

app.post('/api/submission/:type/submit', auth.requireAuth, wrap(async (req, res) => {
  if (!checkType(req, res)) return;
  const sub = await getOrCreateSubmission(req.user.uid, req.params.type);
  // Only draft/error submissions can (re)submit — a second submit on a scored
  // submission must not silently queue it for re-scoring.
  const updated = await one(
    `update submissions
        set status = 'submitted', submitted_at = coalesce(submitted_at, now()),
            scoring_attempts = 0, updated_at = now()
      where id = $1 and status in ('draft', 'error')
      returning *`,
    [sub.id]
  );
  if (!updated) return res.status(409).json({ error: 'Already submitted' });
  res.json({ submission: updated });
}));

// ---- Uploads (Vercel Blob client-upload token) ----
app.post('/api/upload', auth.requireAuth, rateLimit({ max: 30 }), wrap(async (req, res) => {
  const jsonResponse = await handleUpload({
    request: req,
    body: req.body,
    onBeforeGenerateToken: async () => ({
      allowedContentTypes: [
        'audio/mpeg', 'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/aac',
        'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/webm', 'audio/3gpp',
        'application/octet-stream',
      ],
      // Whisper rejects anything larger, so don't accept it in the first place.
      maximumSizeInBytes: config.MAX_AUDIO_BYTES,
      tokenPayload: JSON.stringify({ uid: req.user.uid }),
    }),
    onUploadCompleted: async () => { /* registration happens via POST /api/recordings */ },
  });
  res.json(jsonResponse);
}));

const RECORDING_KINDS = ['bd_call', 'negotiation', 'price', 'call'];
// Which child table a recording's ref_id must point into, per kind.
const KIND_TABLE = { bd_call: 'bd_calls', negotiation: 'market_negotiations', price: 'market_prices' };

function isAllowedBlobUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname.endsWith('.blob.vercel-storage.com');
  } catch {
    return false;
  }
}

// Register an uploaded recording against a call row.
app.post('/api/recordings', auth.requireAuth, rateLimit({ max: 30 }), wrap(async (req, res) => {
  const body = req.body || {};
  if (!ASSIGNMENT_TYPES.includes(body.assignment_type)) {
    return res.status(400).json({ error: 'Bad assignment_type' });
  }
  const kind = v.oneOf(RECORDING_KINDS, body.kind, 'kind') || 'call';
  // The cron fetches this URL server-side and sends it to the transcriber —
  // only our own Blob store is acceptable.
  if (!body.blob_url || !isAllowedBlobUrl(body.blob_url)) {
    return res.status(400).json({ error: 'blob_url must be a Vercel Blob URL' });
  }
  const refId = body.ref_id === undefined || body.ref_id === null || body.ref_id === ''
    ? null
    : v.id(body.ref_id, 'ref_id');

  const sub = await getOrCreateSubmission(req.user.uid, body.assignment_type);
  if (LOCKED_STATUSES.includes(sub.status)) {
    return res.status(409).json({ error: 'Already submitted — locked for editing' });
  }
  // A ref_id must point at one of this submission's own call rows.
  if (refId && KIND_TABLE[kind]) {
    const ref = await one(
      `select id from ${KIND_TABLE[kind]} where id = $1 and submission_id = $2`,
      [refId, sub.id]
    );
    if (!ref) return res.status(400).json({ error: 'ref_id does not belong to this submission' });
  }

  const rec = await one(
    `insert into recordings (submission_id, kind, ref_id, blob_url, filename, content_type, size_bytes)
     values ($1,$2,$3,$4,$5,$6,$7) returning *`,
    [
      sub.id, kind, refId,
      v.text(body.blob_url, 'blob_url', 2000),
      v.text(body.filename, 'filename', 300),
      v.text(body.content_type, 'content_type', 100),
      v.numeric(body.size_bytes, 'size_bytes'),
    ]
  );
  res.json({ recording: rec });
}));

app.delete('/api/recordings/:id', auth.requireAuth, wrap(async (req, res) => {
  // Only allow deleting your own, and only before submission.
  const rec = await one(
    `select r.*, s.status as submission_status
       from recordings r join submissions s on s.id = r.submission_id
      where r.id = $1 and s.user_id = $2`,
    [v.id(req.params.id), req.user.uid]
  );
  if (!rec) return res.status(404).json({ error: 'Not found' });
  if (LOCKED_STATUSES.includes(rec.submission_status)) {
    return res.status(409).json({ error: 'Already submitted — locked' });
  }
  await query(`delete from recordings where id = $1`, [rec.id]);
  // Best-effort blob cleanup; the DB row is the source of truth.
  try {
    await deleteBlob(rec.blob_url);
  } catch (e) {
    console.error('[recordings] blob delete failed:', e.message);
  }
  res.json({ ok: true });
}));

// ---- Admin ----
app.get('/api/admin/candidates', auth.requireAdmin, wrap(async (req, res) => {
  const rows = await many(
    `select s.id, s.assignment_type, s.society, s.status, s.submitted_at,
            u.name, u.email, u.picture,
            sc.overall, sc.recommendation, sc.summary,
            (select count(*) from recordings r where r.submission_id = s.id) as recordings,
            (select count(*) from recordings r where r.submission_id = s.id and r.transcript is not null) as transcribed
       from submissions s
       join users u on u.id = s.user_id
       left join scores sc on sc.submission_id = s.id
      where s.status <> 'draft'
      order by sc.overall desc nulls last, s.submitted_at desc nulls last`
  );
  res.json({ candidates: rows });
}));

app.get('/api/admin/submission/:id', auth.requireAdmin, wrap(async (req, res) => {
  const sub = await one(`select * from submissions where id = $1`, [v.id(req.params.id)]);
  if (!sub) return res.status(404).json({ error: 'Not found' });
  const bundle = await getBundle(sub.id, sub.assignment_type);
  const user = await one(`select id, email, name, picture from users where id = $1`, [sub.user_id]);
  res.json({ ...bundle, user });
}));

app.post('/api/admin/rescore/:id', auth.requireAdmin, wrap(async (req, res) => {
  const sub = await one(`select * from submissions where id = $1`, [v.id(req.params.id)]);
  if (!sub) return res.status(404).json({ error: 'Not found' });
  await query(
    `update submissions set status = 'submitted', scoring_attempts = 0, updated_at = now() where id = $1`,
    [sub.id]
  );
  res.json({ ok: true, queued: true });
}));

// ---- Cron: transcribe + score pending submissions ----
function cronAuthorized(req) {
  const secret = config.CRON_SECRET;
  // Fail closed in production: no secret configured means no access.
  if (!secret) return !config.IS_PROD;
  const expected = Buffer.from(`Bearer ${secret}`);
  const got = Buffer.from(String(req.headers.authorization || ''));
  return got.length === expected.length && crypto.timingSafeEqual(got, expected);
}

async function cronHandler(req, res) {
  if (!cronAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });
  const limit = Math.min(Math.max(Number(req.query.limit) || 5, 1), 20);
  const results = await runScorer(limit);
  res.json({ processed: results.length, results });
}
app.get('/api/cron/score', wrap(cronHandler));
app.post('/api/cron/score', wrap(cronHandler));

// ---- Fallthrough + errors ----
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// Central error handler: expected errors keep their message, everything else
// is logged server-side and returned opaque.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body too large' });
  }
  const status = err.status || (err.name === 'ValidationError' ? 400 : 500);
  if (status >= 500) {
    console.error(`[api] ${req.method} ${req.path} failed:`, err.stack || err);
    return res.status(500).json({ error: 'Something went wrong on our side — please try again' });
  }
  res.status(status).json({ error: err.message });
});

module.exports = app;
