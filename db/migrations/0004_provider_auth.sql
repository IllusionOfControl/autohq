-- 0004_provider_auth — OAuth tokens per external provider (HH to start).
-- Idempotent: safe to re-run.
--
-- Only tokens live here. Client id/secret stay in env (HH_CLIENT_ID /
-- HH_CLIENT_SECRET) so the secret never lands in the database or git.

create table if not exists provider_auth (
  provider      text primary key,          -- 'hh' | future providers
  access_token  text,
  refresh_token text,
  expires_at    timestamptz,               -- when access_token stops working
  scope         text,
  connected_at  timestamptz,               -- first successful authorization
  updated_at    timestamptz default now()
);
