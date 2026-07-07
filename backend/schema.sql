-- Openhouse intern assessment portal — schema
-- Postgres (Vercel Postgres / Neon)

create table if not exists users (
  id           bigserial primary key,
  email        text unique not null,
  name         text,
  picture      text,
  role         text not null default 'candidate',   -- 'candidate' | 'admin'
  created_at   timestamptz not null default now()
);

-- One submission per (user, assignment_type). This is the top-level record the
-- admin scores against. Trackers write child rows keyed by submission_id.
create table if not exists submissions (
  id              bigserial primary key,
  user_id         bigint not null references users(id) on delete cascade,
  assignment_type text not null,                     -- 'bd' | 'market'
  society         text,
  config          text,                              -- BD: chosen configuration
  market_price    numeric,                           -- BD: the defensible number
  comparables     text,                              -- BD: how price was established
  status          text not null default 'draft',     -- draft | submitted | scoring | scored | error
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
  super_area    numeric,
  carpet_area   numeric,
  towers        text,
  units         numeric,
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
  price         numeric,
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
  facing        text,        -- 'park' | 'nonpark'
  call_type     text,        -- 'compromise' | 'urgency'
  budget        numeric,
  offer         numeric,
  can_close     text,        -- 'yes' | 'no' | 'unclear'
  notes         text,
  created_at    timestamptz not null default now()
);

-- ---- BD tracker child table (one row per owner call) ----
create table if not exists bd_calls (
  id            bigserial primary key,
  submission_id bigint not null references submissions(id) on delete cascade,
  config        text,
  size          numeric,
  asking_price  numeric,     -- owner's listed / anchor price
  outcome_price numeric,     -- number the owner came down to on the call
  outcome       text,        -- free text: agreed / refused / follow-up etc.
  notes         text,        -- objection handling, what actually moved them
  created_at    timestamptz not null default now()
);

-- ---- Recordings (audio uploaded to Vercel Blob) ----
-- Linked to a specific call row via (kind, ref_id). kind = 'bd_call' | 'negotiation' | 'price'
create table if not exists recordings (
  id             bigserial primary key,
  submission_id  bigint not null references submissions(id) on delete cascade,
  kind           text not null,
  ref_id         bigint,
  blob_url       text not null,
  filename       text,
  content_type   text,
  size_bytes     bigint,
  duration_sec   numeric,
  transcript     text,
  transcript_lang text,
  status         text not null default 'uploaded',   -- uploaded | transcribing | transcribed | error
  error          text,
  created_at     timestamptz not null default now()
);

-- ---- AI scores (one current row per submission) ----
create table if not exists scores (
  id            bigserial primary key,
  submission_id bigint not null references submissions(id) on delete cascade,
  overall       numeric,                 -- 0-100
  recommendation text,                    -- 'strong' | 'consider' | 'weak'
  breakdown     jsonb,                    -- per-criterion scores + reasoning
  strengths     jsonb,                    -- string[]
  red_flags     jsonb,                    -- string[]
  summary       text,
  rubric_version text,
  model         text,
  created_at    timestamptz not null default now(),
  unique (submission_id)
);

create index if not exists idx_submissions_user on submissions(user_id);
create index if not exists idx_recordings_submission on recordings(submission_id);
create index if not exists idx_recordings_status on recordings(status);
