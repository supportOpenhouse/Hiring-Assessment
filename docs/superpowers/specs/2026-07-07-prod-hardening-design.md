# Production hardening — schema, backend, frontend

Date: 2026-07-07. Scope: make the existing single-deployment app production-grade
without changing its feature set or architecture. No new runtime dependencies.

## Problems found (ranked)

**Security**
1. `GET /api/cron/score` is wide open when `CRON_SECRET` is unset — anyone can burn
   OpenAI/Anthropic credits. Must fail closed in production.
2. `SESSION_SECRET` silently falls back to a hardcoded dev secret — in production
   that means anyone can forge an admin JWT. Must fail fast in production.
3. `db.js` uses `ssl: { rejectUnauthorized: false }` — DB traffic is MITM-able.
   Neon/Vercel Postgres present valid public-CA certs; verification should be on.
4. `POST /api/recordings` accepts any `blob_url` — the cron later `fetch()`es it
   server-side (SSRF) and sends it to OpenAI. Must whitelist Vercel Blob hosts.
5. `requireAdmin` trusts the 7-day-old JWT role claim; role changes don't take
   effect until re-login. Re-check role from DB on admin routes.
6. No security headers, `x-powered-by` on, no rate limiting on auth/upload.
7. 500 handler echoes internal error messages (SQL details) to clients.

**Correctness**
8. Unvalidated writes: any string reaches Postgres `numeric`/`date` columns →
   uncaught cast errors → 500s (and leaked messages). Same for `:id` params.
9. `getOrCreateSubmission` races: two concurrent first requests → unique-violation 500.
10. Cron overlap: two runs can both grab the same `submitted` rows (double scoring,
    double Whisper spend). Claim rows atomically with `FOR UPDATE SKIP LOCKED`.
11. Transient scoring failures park submissions in `error` forever (manual rescore
    only). Retry up to 3 attempts; `scoring` rows stuck >10 min are reclaimed.
12. Upload cap is 60 MB but Whisper rejects >25 MB — long calls upload fine and
    then always fail transcription. Align caps at 25 MB (client + server + fetch).
13. Recordings can be registered/deleted after submission (lock only covers rows).
14. Deleting a recording orphans the blob in Vercel Blob storage.

**Schema**
15. No CHECK constraints on any enum-ish column (`status`, `role`,
    `assignment_type`, `facing`, `call_type`, `recommendation`, …) — junk states
    possible. No non-negative checks on money/area columns.
16. Missing indexes: every child table (`market_*`, `bd_calls`) is seq-scanned per
    bundle read; cron scan has no partial index on `submissions(status)`.

**Frontend**
17. No ErrorBoundary — any render error = blank page.
18. On 401 the token is cleared but React auth state isn't — app is stuck until
    manual refresh. Broadcast an auth-expired event; AuthProvider logs out.
19. No fetch timeout — a hung request spins forever.
20. No client-side file-size check before a doomed 30-MB upload.

## Approach

Chosen: **harden in place, zero new dependencies** (hand-rolled headers + tiny
fixed-window rate limiter), additive schema file kept idempotent for fresh DBs;
existing dev DBs are recreated via `npm run init-db -- --reset` (no prod data
exists yet per CHANGELOG). Rejected: adding helmet/express-rate-limit/zod (dep
drift across root+backend package.json for marginal gain at this size) and a
migration framework (no live data to migrate).

## Design

- `backend/src/config.js` (new): reads env once; in production (`VERCEL` or
  `NODE_ENV=production`) throws at boot if `SESSION_SECRET`, `POSTGRES_URL`, or
  `GOOGLE_CLIENT_ID` is missing; warns if `CRON_SECRET` missing.
- `backend/src/validate.js` (new): `ValidationError` (→400) + coercers
  `id`, `numeric` (strips ₹/commas, 0..1e12), `text(max)`, `date`, `enum`;
  `data.js` column specs gain types; all route params/bodies validated.
- `app.js`: no-store + nosniff/frame/referrer headers on `/api`; `x-powered-by`
  off; fixed-window per-IP limiter (auth 10/min, upload 30/min); cron 401s
  whenever the secret is absent/wrong in production; recordings routes get lock
  check, kind enum (`bd_call|negotiation|price|call`), Blob-host whitelist, and
  best-effort `del(blob_url)` on delete; JSON 404 for unknown `/api/*`; central
  error handler (ValidationError→400, else opaque 500 + server-side log).
- `auth.js`: secret from config (no fallback in prod); `requireAdmin` re-reads
  role from `users`.
- `db.js`: TLS verification on for non-local hosts (`PGSSL_NO_VERIFY=1` escape
  hatch), `statement_timeout` 15 s, pool error handler.
- `scoring/run.js`: single atomic claim query (`submitted` | stale `scoring`
  >10 min | `error` with `scoring_attempts < 3`, `FOR UPDATE SKIP LOCKED`,
  increments attempts); admin rescore resets attempts.
- `transcribe.js`: refuse >25 MB downloads with a clear error.
- `schema.sql`: named CHECK constraints on all enum/nonneg columns,
  `scoring_attempts int`, indexes on every child `submission_id`, partial index
  on `submissions(status)` for the cron scan, `recordings(kind, ref_id)`.
- `scripts/init-db.js`: `--reset` flag (drops known tables, requires
  `RESET_OK=1`) then applies schema.
- Frontend: `ErrorBoundary` wrapping the app; `api.js` 30 s AbortController
  timeout + `oh:auth-expired` event on 401 consumed by `AuthProvider`;
  `RecordingUploader` rejects files >25 MB before upload.
- Tests: `backend/test/validate.test.js` with `node:test` (pure, no DB), wired
  as `npm test` in backend.

## Verification

`node --check` all backend files; `npm test` (backend); full frontend build;
`require('./api/index.js')` still loads; if a local Postgres is reachable,
init-db + live smoke of health/auth/CRUD; otherwise schema is exercised in CI of
first deploy.
