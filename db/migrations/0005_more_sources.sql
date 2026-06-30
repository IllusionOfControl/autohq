-- 0005_more_sources — add rabota.by and Habr Career as toggleable sources.
-- Idempotent: existing rows (and their toggle states) are never overwritten.
--
-- 0001_init only seeds remotive/arbeitnow/hh/djinni; these two arrived later
-- (rabota.by via Apify, Habr Career). The settings endpoint self-heals an
-- *empty* table, but established databases need this top-up.
insert into source_settings (source_id, label, site_enabled, telegram_enabled) values
  ('rabota', 'rabota.by',     true, false),
  ('habr',   'Хабр Карьера',  true, true)
on conflict (source_id) do nothing;
