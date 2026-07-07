# Openhouse — Intern Assignment & Assessment Portal

A hiring tool for Openhouse internship candidates. Candidates sign in with Google,
complete one of two field assignments (Market Research or Business Development),
log their fieldwork, and upload their call recordings. An AI pipeline transcribes
the calls and scores each candidate against the assignment rubric. Admins get a
ranked dashboard.

```
frontend/   React + Vite       → static SPA        (candidate + admin UI)
backend/    Node/Express + AI  → /api function     (API, Postgres, Blob, scoring)
api/        serverless entry   → wraps backend/src as the single /api function
```

Everything deploys as **one Vercel project** from the repo root: the root
`vercel.json` builds the SPA into `frontend/dist` and serves the Express app as a
single serverless function at `/api`. One domain, no CORS setup.

## What it does

- **Google login** gates out non-serious candidates. Any Google account = candidate;
  emails in `ADMIN_EMAILS` = admin.
- **Two trackers**, rebuilt with the Openhouse brand from the original HTML:
  - *Market Research* — configs/sizes, floor plans, 10+ broker baseline-price calls
    (with a live broker-coverage meter), compromise vs. urgency negotiation calls.
  - *Business Development* — establish a market price, then log & record 3 owner
    negotiation calls.
- **Audio upload** straight to Vercel Blob; candidates attach a recording to each call.
- **AI scoring** (runs after submit, on a cron): Whisper transcribes each call
  (Hindi/English), then Claude scores the submission against each assignment's
  "What good looks like" rubric — per-criterion scores, strengths, red flags, and a
  strong/consider/weak recommendation.
- **Admin dashboard** ranks candidates by score, with drill-down to transcripts,
  audio players, the full breakdown, and a "re-run scoring" button.

## Architecture notes

- Auth: Google ID token → verified server-side → we mint our own 7-day session JWT
  (Bearer token in `localStorage`). Frontend and API share one domain, so no
  cross-site cookies or CORS config in production.
- Scoring is **asynchronous** (a Vercel Cron hits `/api/cron/score` every 5 min) so
  long transcriptions don't hit serverless request timeouts. Candidates never see
  their own score.
- Transcription is isolated in `backend/src/scoring/transcribe.js` — swap Whisper for
  Sarvam AI (better Hindi) without touching the scorer.

## Local development

Prereqs: Node 18+, a Postgres URL (Vercel Postgres/Neon or local), and the API keys
below. The app runs without every key, but scoring needs `ANTHROPIC_API_KEY` +
`OPENAI_API_KEY`, and uploads need `BLOB_READ_WRITE_TOKEN`.

```bash
# 1. Backend
cd backend
cp .env.example .env          # fill in values
npm install
npm run init-db               # create tables
npm run dev                   # http://localhost:4000

# 2. Frontend (new terminal)
cd frontend
cp .env.example .env          # set VITE_GOOGLE_CLIENT_ID + VITE_API_BASE
npm install
npm run dev                   # http://localhost:5173
```

Trigger scoring locally without waiting for cron: `cd backend && npm run score`.

## Environment variables

All of these go on the **one Vercel project** (locally: `backend/.env`, plus the
two `VITE_*` vars in `frontend/.env`):

| var | purpose |
|---|---|
| `POSTGRES_URL` | Vercel Postgres / Neon connection string |
| `GOOGLE_CLIENT_ID` | Google OAuth Web client ID |
| `SESSION_SECRET` | random string — signs session JWTs |
| `ADMIN_EMAILS` | comma-separated admin emails (default `ashish@openhouse.in`) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob store token |
| `ANTHROPIC_API_KEY` | Claude — rubric scoring |
| `ANTHROPIC_MODEL` | optional, default `claude-sonnet-5` |
| `OPENAI_API_KEY` | Whisper — transcription |
| `CRON_SECRET` | protects the cron endpoint (Vercel sets the header automatically) |
| `VITE_GOOGLE_CLIENT_ID` | same client ID as `GOOGLE_CLIENT_ID`, for the SPA |
| `VITE_API_BASE` | **local dev only** (`http://localhost:4000`) — leave unset on Vercel so the SPA calls same-origin `/api` |
| `FRONTEND_ORIGIN` | **local dev only** — CORS for `localhost:5173`; unneeded in production (same origin) |

## Deploy (one Vercel project)

1. **Google OAuth** — in Google Cloud Console create an OAuth 2.0 **Web** client.
   Authorized JavaScript origins: your deployment URL (and `http://localhost:5173`).
2. **Import the repo** as a single project → root directory `./`. If Vercel's
   importer auto-selects the multi-service **"Services"** preset, switch the
   Application Preset to **"Other"** — the root `vercel.json` drives the whole
   build (SPA to `frontend/dist`, Express at `/api`, SPA-fallback rewrite, cron).
3. **Env + stores** — add the env vars above (skip the two local-dev-only ones).
   Create a **Postgres** store and a **Blob** store on the project (Vercel injects
   `POSTGRES_URL` / `BLOB_READ_WRITE_TOKEN`). After first deploy, run the schema once
   (`npm run init-db` locally against `POSTGRES_URL`, or paste `schema.sql` in the
   Postgres query editor).
4. **Cron**: the root `vercel.json` schedules `/api/cron/score` every 5 min.
   > Note: Vercel **Hobby** plans run cron only once/day. On Hobby, use the admin
   > "Re-run scoring" button (it processes immediately) or run `npm run score`.

## Assignment rubrics

Scoring anchors live in `backend/src/scoring/rubric.js`, taken directly from each
assignment's "What good looks like" table. Edit weights/anchors there; bump
`RUBRIC_VERSION` when you do.
