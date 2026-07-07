# Changelog

All notable changes to the Openhouse Intern Assignment & Assessment Portal.

## [Unreleased]

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
