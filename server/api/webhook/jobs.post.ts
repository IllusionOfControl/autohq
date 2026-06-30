export default defineEventHandler(async (event) => {
  if (!autohqSecret()) {
    throw createError({ status: 500, message: 'AUTOHQ_SECRET_TOKEN is not configured' })
  }
  if (!hasValidAutohqToken(event)) {
    throw createError({ status: 401, message: 'Unauthorized' })
  }

  const body = await readBody(event)

  if (!body?.title || !body?.company) {
    throw createError({ status: 400, message: 'title and company are required' })
  }

  const sql = useDb()

  let siteEnabled = true
  let telegramEnabled = true

  if (body.source) {
    const [settings] = await sql`
      select site_enabled, telegram_enabled
      from source_settings
      where source_id = ${body.source}
    `
    if (settings) {
      siteEnabled = settings.site_enabled
      telegramEnabled = settings.telegram_enabled
    }
  }

  if (!siteEnabled) {
    return { ok: true, skipped: true, telegram_notify: false }
  }

  // Cross-posting dedup with a freshness window.
  // The same vacancy often appears under different URLs (LinkedIn reblogs
  // HH/Djinni, aggregators re-post), so the UNIQUE index on `url` can't catch it
  // — every copy has its own link. We dedup by title + company (case-insensitive).
  //
  // BUT a company may re-open the SAME role months later, and Alex may want to
  // apply to that fresh opening. So we only treat a match as a duplicate if we
  // first saw it within the last DEDUP_WINDOW_DAYS. An older match is considered
  // a genuine re-posting and is allowed back in.
  const DEDUP_WINDOW_DAYS = 30
  const since = new Date(Date.now() - DEDUP_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const escapeLike = (s: string) => s.replace(/[%_\\]/g, '\\$&')
  const [existing] = await sql`
    select id from jobs
    where title ilike ${escapeLike(String(body.title))}
      and company ilike ${escapeLike(String(body.company))}
      and created_at >= ${since}
    limit 1
  `

  if (existing) {
    return { ok: true, skipped: true, duplicate: true, telegram_notify: false }
  }

  const fitScore = body.fit_score != null ? Number(body.fit_score) : null

  const row = {
    title: String(body.title),
    company: String(body.company),
    url: body.url ? String(body.url) : null,
    location: body.location ? String(body.location) : null,
    remote: Boolean(body.remote ?? false),
    status: body.status ?? 'new',
    fit_score: fitScore,
    salary_min: body.salary_min != null ? Number(body.salary_min) : null,
    salary_max: body.salary_max != null ? Number(body.salary_max) : null,
    notes: body.notes ? String(body.notes) : null,
    description: body.description ? String(body.description) : null,
    cover_letter: body.cover_letter ? String(body.cover_letter) : null,
    score_reason: body.score_reason ? String(body.score_reason) : null,
    source: body.source ? String(body.source) : null,
    external_id: body.external_id != null ? String(body.external_id) : null,
  }

  let created: { id: string | number } | undefined
  try {
    [created] = await sql`insert into jobs ${sql(row)} returning id`
  } catch (e: any) {
    // Duplicate (url or source+external_id) — silently skip
    if (e?.code === '23505') {
      return { ok: true, skipped: true, telegram_notify: false }
    }
    throw createError({ status: 500, message: e?.message ?? 'Insert failed' })
  }

  if (!created) throw createError({ status: 500, message: 'Insert failed' })
  const id = created.id

  // Telegram threshold is a live setting (app_config), default 70
  let minScore = 70
  const [cfg] = await sql`select telegram_min_score from app_config where id = 1`
  if (cfg?.telegram_min_score != null) minScore = cfg.telegram_min_score

  const scorePassed = fitScore === null || fitScore >= minScore
  return { ok: true, id, telegram_notify: telegramEnabled && scorePassed }
})
