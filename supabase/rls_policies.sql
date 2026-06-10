-- Row Level Security policies for AutoHQ
-- Run this in the Supabase SQL editor (Dashboard > SQL Editor)

-- Enable RLS on the jobs table
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all rows
CREATE POLICY "Authenticated users can read jobs"
  ON jobs FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert
CREATE POLICY "Authenticated users can insert jobs"
  ON jobs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update
CREATE POLICY "Authenticated users can update jobs"
  ON jobs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete
CREATE POLICY "Authenticated users can delete jobs"
  ON jobs FOR DELETE
  TO authenticated
  USING (true);

-- Allow service role (webhook) to bypass RLS — no policy needed,
-- service role always bypasses RLS by default.

-- If you have a source_settings table, enable RLS there too:
-- ALTER TABLE source_settings ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Authenticated users can read source_settings"
--   ON source_settings FOR SELECT TO authenticated USING (true);
-- CREATE POLICY "Authenticated users can update source_settings"
--   ON source_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
