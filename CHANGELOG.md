# Changelog

All notable changes to the Openhouse Intern Assignment & Assessment Portal.

## [Unreleased]

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
