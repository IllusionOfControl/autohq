-- 0002_jobs_external_id — track the source's own job id so vacancy ids
-- from different sources don't collide.
-- Idempotent: safe to re-run.

-- ── jobs.external_id ────────────────────────────────────
-- The id the source uses for the vacancy (e.g. Remotive item.id, HH item.id).
-- Scoped per source: the same external_id from two different sources is fine,
-- so we dedupe on (source, external_id) rather than external_id alone.
alter table jobs add column if not exists external_id text;

-- Deduplicate by (source, external_id) (rows without both are exempt)
create unique index if not exists jobs_source_external_id_unique
  on jobs(source, external_id)
  where source is not null and external_id is not null;
