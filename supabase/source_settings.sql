create table if not exists source_settings (
  source_id text primary key,
  label text not null,
  site_enabled boolean not null default true,
  telegram_enabled boolean not null default true,
  updated_at timestamptz default now()
);

alter table source_settings enable row level security;
create policy "allow all" on source_settings for all using (true) with check (true);

insert into source_settings (source_id, label, site_enabled, telegram_enabled) values
  ('remotive', 'Remotive.com', true, true),
  ('arbeitnow', 'Arbeitnow', true, true),
  ('hh', 'HH.ru', false, false)
on conflict (source_id) do nothing;
