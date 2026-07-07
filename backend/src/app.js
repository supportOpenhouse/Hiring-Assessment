const express = require('express');
const cors = require('cors');
const { handleUpload } = require('@vercel/blob/client');

const { one, many, query } = require('./db');
const auth = require('./auth');
const {
  ASSIGNMENT_TYPES, TABLES,
  getOrCreateSubmission, getBundle, updateSubmissionFields, insertRow, deleteRow,
} = require('./data');
const { runScorer } = require('./scoring/run');

const app = express();

const ORIGINS = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173')
  .split(',').map((s) => s.trim()).filter(Boolean);

app.use(cors({ origin: ORIGINS.includes('*') ? true : ORIGINS }));
app.use(express.json({ limit: '2mb' }));

const wrap = (fn) => (req, res) => fn(req, res).catch((e) => {
  console.error(e);
  res.status(500).json({ error: e.message || 'Server error' });
});

function checkType(req, res) {
  if (!ASSIGNMENT_TYPES.includes(req.params.type)) {
    res.status(404).json({ error: 'Unknown assignment' });
    return false;
  }
  return true;
}

// ---- Meta ----
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.get('/api/config', (req, res) => res.json({ googleClientId: auth.GOOGLE_CLIENT_ID || null }));

// ---- Auth ----
app.post('/api/auth/google', wrap(async (req, res) => {
  const { idToken } = req.body || {};
  if (!idToken) return res.status(400).json({ error: 'Missing idToken' });
  const profile = await auth.verifyGoogleIdToken(idToken);
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
  if (sub.status === 'submitted' || sub.status === 'scoring' || sub.status === 'scored') {
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
  if (['submitted', 'scoring', 'scored'].includes(sub.status)) {
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
  if (['submitted', 'scoring', 'scored'].includes(sub.status)) {
    return res.status(409).json({ error: 'Already submitted — locked' });
  }
  await deleteRow(sub.id, table, req.params.id);
  res.json({ ok: true });
}));

app.post('/api/submission/:type/submit', auth.requireAuth, wrap(async (req, res) => {
  if (!checkType(req, res)) return;
  const sub = await getOrCreateSubmission(req.user.uid, req.params.type);
  const updated = await one(
    `update submissions set status = 'submitted', submitted_at = coalesce(submitted_at, now()), updated_at = now()
     where id = $1 returning *`,
    [sub.id]
  );
  res.json({ submission: updated });
}));

// ---- Uploads (Vercel Blob client-upload token) ----
app.post('/api/upload', auth.requireAuth, wrap(async (req, res) => {
  const jsonResponse = await handleUpload({
    request: req,
    body: req.body,
    onBeforeGenerateToken: async () => ({
      allowedContentTypes: [
        'audio/mpeg', 'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/aac',
        'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/webm', 'audio/3gpp',
        'application/octet-stream',
      ],
      maximumSizeInBytes: 60 * 1024 * 1024, // 60 MB
      tokenPayload: JSON.stringify({ uid: req.user.uid }),
    }),
    onUploadCompleted: async () => { /* registration happens via POST /api/recordings */ },
  });
  res.json(jsonResponse);
}));

// Register an uploaded recording against a call row.
app.post('/api/recordings', auth.requireAuth, wrap(async (req, res) => {
  const { assignment_type, kind, ref_id, blob_url, filename, content_type, size_bytes } = req.body || {};
  if (!ASSIGNMENT_TYPES.includes(assignment_type)) return res.status(400).json({ error: 'Bad assignment_type' });
  if (!blob_url) return res.status(400).json({ error: 'Missing blob_url' });
  const sub = await getOrCreateSubmission(req.user.uid, assignment_type);
  const rec = await one(
    `insert into recordings (submission_id, kind, ref_id, blob_url, filename, content_type, size_bytes)
     values ($1,$2,$3,$4,$5,$6,$7) returning *`,
    [sub.id, kind || 'call', ref_id || null, blob_url, filename || null, content_type || null, size_bytes || null]
  );
  res.json({ recording: rec });
}));

app.delete('/api/recordings/:id', auth.requireAuth, wrap(async (req, res) => {
  // Only allow deleting your own, and only before submission.
  const rec = await one(
    `select r.* from recordings r join submissions s on s.id = r.submission_id
     where r.id = $1 and s.user_id = $2`,
    [req.params.id, req.user.uid]
  );
  if (!rec) return res.status(404).json({ error: 'Not found' });
  await query(`delete from recordings where id = $1`, [rec.id]);
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
  const sub = await one(`select * from submissions where id = $1`, [req.params.id]);
  if (!sub) return res.status(404).json({ error: 'Not found' });
  const bundle = await getBundle(sub.id, sub.assignment_type);
  const user = await one(`select id, email, name, picture from users where id = $1`, [sub.user_id]);
  res.json({ ...bundle, user });
}));

app.post('/api/admin/rescore/:id', auth.requireAdmin, wrap(async (req, res) => {
  const sub = await one(`select * from submissions where id = $1`, [req.params.id]);
  if (!sub) return res.status(404).json({ error: 'Not found' });
  await query(`update submissions set status = 'submitted', updated_at = now() where id = $1`, [sub.id]);
  res.json({ ok: true, queued: true });
}));

// ---- Cron: transcribe + score pending submissions ----
async function cronHandler(req, res) {
  const secret = process.env.CRON_SECRET;
  const authz = req.headers.authorization || '';
  if (secret && authz !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const results = await runScorer(Number(req.query.limit) || 5);
  res.json({ processed: results.length, results });
}
app.get('/api/cron/score', wrap(cronHandler));
app.post('/api/cron/score', wrap(cronHandler));

module.exports = app;
