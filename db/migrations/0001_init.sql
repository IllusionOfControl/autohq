-- 0001_init — full base schema for AutoHQ.
-- Idempotent: safe to run against a fresh database OR an existing one
-- (this doubles as the baseline for databases migrated from the old
-- supabase/*.sql files). No RLS — access is enforced by the app's auth
-- middleware, and the app connects with the database owner role.

-- ── jobs ────────────────────────────────────────────────
create table if not exists jobs (
  id            bigint generated always as identity primary key,
  title         text not null,
  company       text not null,
  url           text,
  location      text,
  remote        boolean default false,
  status        text default 'new',           -- new | reviewing | applied | interviewing | offer | rejected | archived
  fit_score     integer,                       -- 0–100
  salary_min    integer,
  salary_max    integer,
  notes         text,
  description   text,
  cover_letter  text,
  score_reason  text,
  source        text,                          -- remotive | arbeitnow | hh | djinni
  applied_at    timestamptz,
  created_at    timestamptz default now()
);

-- Deduplicate by URL (NULL urls are exempt)
create unique index if not exists jobs_url_unique on jobs(url) where url is not null;

-- ── app_config (single row, id = 1) ─────────────────────
create table if not exists app_config (
  id                 integer primary key default 1,
  keywords           text not null default 'vue nuxt typescript frontend',
  telegram_min_score integer not null default 70,
  updated_at         timestamptz default now()
);

insert into app_config (id, keywords, telegram_min_score)
values (1, 'vue nuxt typescript frontend', 70)
on conflict (id) do nothing;

-- ── source_settings ─────────────────────────────────────
create table if not exists source_settings (
  source_id        text primary key,
  label            text not null,
  site_enabled     boolean not null default true,
  telegram_enabled boolean not null default true,
  updated_at       timestamptz default now()
);

insert into source_settings (source_id, label, site_enabled, telegram_enabled) values
  ('remotive',  'Remotive.com', true,  true),
  ('arbeitnow', 'Arbeitnow',    true,  true),
  ('hh',        'HH.ru',        false, false),
  ('djinni',    'Djinni',       true,  true)
on conflict (source_id) do nothing;

-- ── profile (single row, id = 1) ────────────────────────
create table if not exists profile (
  id                 integer primary key default 1,
  name               text,
  title              text,
  location           text,
  email              text,
  github             text,
  linkedin           text,
  summary            text,
  skills             text,
  experience         text,
  languages          text,
  salary_expectation text,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);
