/**
 * Runtime payload for the HH n8n workflow, in one secret-gated call.
 *
 * Authenticated by the shared webhook secret (same one n8n already uses), so it
 * can live outside the session gate. Returns the live search config plus a
 * fresh HH access token (auto-refreshed; null when HH isn't connected, in which
 * case the workflow falls back to anonymous search).
 */
const DEFAULTS = {
  keywords: 'vue nuxt typescript frontend',
  telegram_min_score: 70,
  job_lookback_days: 3,
}

export default defineEventHandler(async (event) => {
  const secret = process.env.WEBHOOK_SECRET || process.env.NUXT_WEBHOOK_SECRET
  if (!secret) {
    throw createError({ status: 500, message: 'WEBHOOK_SECRET is not configured' })
  }
  if (getHeader(event, 'x-webhook-secret') !== secret) {
    throw createError({ status: 401, message: 'Unauthorized' })
  }

  let config = { ...DEFAULTS }
  try {
    const sql = useDb()
    const [row] = await sql`
      select keywords, telegram_min_score, job_lookback_days from app_config where id = 1
    `
    if (row) {
      config = {
        keywords: row.keywords ?? DEFAULTS.keywords,
        telegram_min_score: row.telegram_min_score ?? DEFAULTS.telegram_min_score,
        job_lookback_days: row.job_lookback_days ?? DEFAULTS.job_lookback_days,
      }
    }
  } catch {
    // keep DEFAULTS if app_config isn't migrated yet
  }

  const hh_access_token = await getValidHhAccessToken()

  return { ...config, hh_access_token }
})
