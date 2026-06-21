import postgres from 'postgres'

/**
 * Direct PostgreSQL connection (porsager/postgres).
 *
 * Replaces the Supabase JS client for all server-side data access. The pool is
 * created lazily and reused across requests (important on serverless, where the
 * module is kept warm between invocations).
 *
 * DATABASE_URL — Postgres connection string. With Supabase, use the connection
 * string of the `postgres` role (it owns the tables and bypasses RLS, so the
 * old JWT-based policies don't get in the way). On Vercel point it at the
 * pooler (pgBouncer, port 6543); `prepare: false` is required there.
 */
let _sql: ReturnType<typeof postgres> | null = null

export function useDb() {
  if (_sql) return _sql
  const url = process.env.DATABASE_URL || process.env.NUXT_DATABASE_URL
  if (!url) {
    throw createError({ status: 500, message: 'DATABASE_URL is not configured' })
  }
  _sql = postgres(url, { prepare: false })
  return _sql
}
