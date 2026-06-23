import { createClient } from '@supabase/supabase-js'

/**
 * Server-side Supabase client using the service-role key.
 *
 * Tables like `source_settings`, `app_config` and `jobs` are RLS-locked to the
 * single owner (see supabase/owner_lock.sql), so the public/anon key can't read
 * or write them from a server route (no user JWT) — it just gets 0 rows. Server
 * endpoints that manage these tables must use the service key, which bypasses
 * RLS. Falls back to the public key for local dev where the service key may be
 * absent.
 */
export function supabaseAdmin() {
  const url = process.env.NUXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.NUXT_PUBLIC_SUPABASE_KEY
  if (!url || !key) {
    throw createError({ statusCode: 500, message: 'Supabase not configured' })
  }
  return createClient(url, key)
}
