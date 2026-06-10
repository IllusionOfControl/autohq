-- AI enrichment fields for jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS cover_letter TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS score_reason TEXT;

-- Deduplicate by URL
CREATE UNIQUE INDEX IF NOT EXISTS jobs_url_unique ON jobs(url) WHERE url IS NOT NULL;

-- Add Djinni as a source
INSERT INTO source_settings (source_id, label, site_enabled, telegram_enabled)
VALUES ('djinni', 'Djinni', true, true)
ON CONFLICT (source_id) DO NOTHING;
