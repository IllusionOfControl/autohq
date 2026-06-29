-- 0003_app_config_lookback — make the job search lookback window configurable.
-- Idempotent: safe to re-run.

-- ── app_config.job_lookback_days ────────────────────────
-- How many days back the source workflows look (HH's date_from window).
-- 0 means "all time" — the workflow then drops the lower bound entirely
-- (capped only by the source's own paging limit, e.g. HH's 2000 results).
alter table app_config
  add column if not exists job_lookback_days integer not null default 3;
