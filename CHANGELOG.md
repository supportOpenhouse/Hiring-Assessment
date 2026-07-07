# Changelog

All notable changes to the Openhouse Intern Assignment & Assessment Portal.

## [Unreleased]

### Added — 2026-07-07 — Production hardening
- **Security**: fail-fast env validation in production (`src/config.js`); cron
  endpoint fails closed without a matching `CRON_SECRET` (constant-time compare);
  `SESSION_SECRET` no longer silently falls back to a dev secret in production;
  admin routes re-check role from the DB instead of trusting the JWT claim;
  TLS certificate verification on for the DB connection; security headers
  (`no-store`/`nosniff`/`DENY`/`no-referrer`) and `x-powered-by` off; per-IP rate
  limits on auth and upload; SSRF guard restricting recording URLs to Vercel Blob;
  central error handler that stops leaking internal messages.
- **Correctness**: typed input validation on every write (`src/validate.js`) with
  matching DB CHECK constraints; race-free `getOrCreateSubmission`; atomic scorer
  claim (`FOR UPDATE SKIP LOCKED`) with stale-row reclaim and a 3-attempt retry
  cap; audio size capped at 25 MB (Whisper's limit) across client/token/fetch;
  recordings can no longer be added or deleted after submission; deleted
  recordings are removed from Blob storage.
- **Schema**: CHECK constraints on all enum/non-negative columns, `scoring_attempts`
  column, indexes on every child table + a partial index for the cron scan;
  `init-db` is now idempotent (in-place migrations) with a `--reset` rebuild flag.
- **Frontend**: React ErrorBoundary; 30 s request timeout; 401 now clears auth
  state app-wide and returns to login; client-side 25 MB upload guard.
- **Legal**: public `/privacy` and `/terms` pages, footer links, and a required
  consent checkbox on sign-in (needed now that external candidates upload call
  recordings of third parties). Drafts pending legal review.
- **Tests**: `backend/npm test` covers the validation layer (`node:test`).

### Changed — 2026-07-07 — Single-deployment consolidation
- The whole app now deploys as **one Vercel project** from the repo root: the root
  `vercel.json` builds the SPA into `frontend/dist` and serves the Express app as a
  single serverless function via `api/index.js`.
- Removed the two-project leftovers (`frontend/vercel.json`, `backend/vercel.json`,
  `backend/api/index.js`) that made Vercel's importer detect multiple services and
  demand a `services` config.
- README rewritten for the single-project deploy (one env-var table; `VITE_API_BASE`
  and `FRONTEND_ORIGIN` are local-dev-only now). Added the missing
  `backend/.env.example` and `frontend/.env.example` the README referenced.

### Added — 2026-07-05 — Initial build (not yet deployed)
- React + Vite frontend and Node/Express backend, structured as two separate Vercel
  projects.
- Google sign-in (any account = candidate; `ADMIN_EMAILS` = admin) with server-side
  ID-token verification and a self-issued 7-day session JWT.
- Two assignment trackers rebuilt from the original HTML with Openhouse branding:
  Market Research (4-tab society ledger + broker-coverage meter) and Business
  Development (owner call tracker, enriched with market-price + per-owner outcome).
- In-app call-recording upload to Vercel Blob, attached per call.
- AI assessment pipeline: Whisper transcription (Hindi/English) → Claude rubric
  scoring, run asynchronously via Vercel Cron. Per-criterion scores, strengths, red
  flags, strong/consider/weak recommendation.
- Admin dashboard: ranked candidates, drill-down to transcripts/audio/breakdown, and
  re-run-scoring.
- Postgres schema, DB init + manual scorer scripts, full README.

> Nothing has been pushed to GitHub or deployed. Awaiting review + explicit approval.
