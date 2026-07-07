-- Openhouse intern assessment portal — schema
-- Postgres (Vercel Postgres / Neon)
--
-- Idempotent for fresh databases. If you are upgrading a dev database created
-- before the CHECK constraints existed, recreate it:
--   RESET_OK=1 npm run init-db -- --reset

create table if not exists users (
  id           bigserial primary key,
  email        text unique not null,
  name         text,
  picture      text,
  role         text not null default 'candidate'
               constraint users_role_chk check (role in ('candidate', 'admin')),
  created_at   timestamptz not null default now()
);

-- One submission per (user, assignment_type). This is the top-level record the
-- admin scores against. Trackers write child rows keyed by submission_id.
create table if not exists submissions (
  id              bigserial primary key,
  user_id         bigint not null references users(id) on delete cascade,
  assignment_type text not null
                  constraint submissions_type_chk check (assignment_type in ('bd', 'market')),
  society         text,
  config          text,                              -- BD: chosen configuration
  market_price    numeric
                  constraint submissions_price_chk check (market_price is null or market_price >= 0),
  comparables     text,                              -- BD: how price was established
  status          text not null default 'draft'
                  constraint submissions_status_chk check (status in ('draft', 'submitted', 'scoring', 'scored', 'error')),
  scoring_attempts int not null default 0,           -- transient-failure retries, capped by the scorer
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  submitted_at    timestamptz,
  unique (user_id, assignment_type)
);

-- ---- Market Research tracker child tables ----
create table if not exists market_configs (
  id            bigserial primary key,
  submission_id bigint not null references submissions(id) on delete cascade,
  config        text,
  super_area    numeric constraint market_configs_super_chk check (super_area is null or super_area >= 0),
  carpet_area   numeric constraint market_configs_carpet_chk check (carpet_area is null or carpet_area >= 0),
  towers        text,
  units         numeric constraint market_configs_units_chk check (units is null or units >= 0),
  source        text,
  notes         text,
  created_at    timestamptz not null default now()
);

create table if not exists market_plans (
  id            bigserial primary key,
  submission_id bigint not null references submissions(id) on delete cascade,
  config        text,
  source        text,
  layout        text,
  link          text,
  created_at    timestamptz not null default now()
);

create table if not exists market_prices (
  id            bigserial primary key,
  submission_id bigint not null references submissions(id) on delete cascade,
  broker        text,
  phone         text,
  config        text,
  price         numeric constraint market_prices_price_chk check (price is null or price >= 0),
  call_date     date,
  notes         text,
  created_at    timestamptz not null default now()
);

create table if not exists market_negotiations (
  id            bigserial primary key,
  submission_id bigint not null references submissions(id) on delete cascade,
  broker        text,
  phone         text,
  config        text,
  floor         text,
  facing        text constraint market_negotiations_facing_chk check (facing is null or facing in ('park', 'nonpark')),
  call_type     text constraint market_negotiations_calltype_chk check (call_type is null or call_type in ('compromise', 'urgency')),
  budget        numeric constraint market_negotiations_budget_chk check (budget is null or budget >= 0),
  offer         numeric constraint market_negotiations_offer_chk check (offer is null or offer >= 0),
  can_close     text constraint market_negotiations_close_chk check (can_close is null or can_close in ('yes', 'no', 'unclear')),
  notes         text,
  created_at    timestamptz not null default now()
);

-- ---- BD tracker child table (one row per owner call) ----
create table if not exists bd_calls (
  id            bigserial primary key,
  submission_id bigint not null references submissions(id) on delete cascade,
  config        text,
  size          numeric constraint bd_calls_size_chk check (size is null or size >= 0),
  asking_price  numeric constraint bd_calls_asking_chk check (asking_price is null or asking_price >= 0),
  outcome_price numeric constraint bd_calls_outcome_chk check (outcome_price is null or outcome_price >= 0),
  outcome       text,        -- free text: agreed / refused / follow-up etc.
  notes         text,        -- objection handling, what actually moved them
  created_at    timestamptz not null default now()
);

-- ---- Recordings (audio uploaded to Vercel Blob) ----
-- Linked to a specific call row via (kind, ref_id).
create table if not exists recordings (
  id             bigserial primary key,
  submission_id  bigint not null references submissions(id) on delete cascade,
  kind           text not null
                 constraint recordings_kind_chk check (kind in ('bd_call', 'negotiation', 'price', 'call')),
  ref_id         bigint,
  blob_url       text not null,
  filename       text,
  content_type   text,
  size_bytes     bigint constraint recordings_size_chk check (size_bytes is null or size_bytes >= 0),
  duration_sec   numeric,
  transcript     text,
  transcript_lang text,
  status         text not null default 'uploaded'
                 constraint recordings_status_chk check (status in ('uploaded', 'transcribing', 'transcribed', 'error')),
  error          text,
  created_at     timestamptz not null default now()
);

-- ---- AI scores (one current row per submission) ----
create table if not exists scores (
  id            bigserial primary key,
  submission_id bigint not null references submissions(id) on delete cascade,
  overall       numeric constraint scores_overall_chk check (overall is null or (overall >= 0 and overall <= 100)),
  recommendation text constraint scores_rec_chk check (recommendation is null or recommendation in ('strong', 'consider', 'weak')),
  breakdown     jsonb,                    -- per-criterion scores + reasoning
  strengths     jsonb,                    -- string[]
  red_flags     jsonb,                    -- string[]
  summary       text,
  rubric_version text,
  model         text,
  created_at    timestamptz not null default now(),
  unique (submission_id)
);

-- ---- Indexes ----
create index if not exists idx_submissions_user on submissions(user_id);
-- Cron scan: only rows that may need scoring.
create index if not exists idx_submissions_pending on submissions(status, submitted_at)
  where status in ('submitted', 'scoring', 'error');

create index if not exists idx_recordings_submission on recordings(submission_id);
create index if not exists idx_recordings_status on recordings(status);
create index if not exists idx_recordings_ref on recordings(kind, ref_id);

-- Every bundle read filters child tables by submission_id.
create index if not exists idx_market_configs_submission on market_configs(submission_id);
create index if not exists idx_market_plans_submission on market_plans(submission_id);
create index if not exists idx_market_prices_submission on market_prices(submission_id);
create index if not exists idx_market_negotiations_submission on market_negotiations(submission_id);
create index if not exists idx_bd_calls_submission on bd_calls(submission_id);

-- ---- In-place migrations ----
-- Re-running this file on a database created before a column/constraint existed
-- upgrades it without dropping data. (CHECK constraints above only apply to
-- freshly-created tables; the application layer enforces the same rules, so an
-- older table missing them is still safe. Use `--reset` for a full rebuild.)
alter table submissions add column if not exists scoring_attempts int not null default 0;
