import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const secret = process.env.WEBHOOK_SECRET
    || process.env.NUXT_WEBHOOK_SECRET
    || 'autohq-webhook-2026'

  const authHeader = getHeader(event, 'x-webhook-secret')
  if (authHeader !== secret) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody(event)

  if (!body?.title || !body?.company) {
    throw createError({ statusCode: 400, message: 'title and company are required' })
  }

  const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NUXT_PUBLIC_SUPABASE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw createError({ statusCode: 500, message: 'Supabase not configured' })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  let siteEnabled = true
  let telegramEnabled = true

  if (body.source) {
    const { data: settings } = await supabase
      .from('source_settings')
      .select('site_enabled, telegram_enabled')
      .eq('source_id', body.source)
      .single()

    if (settings) {
      siteEnabled = settings.site_enabled
      telegramEnabled = settings.telegram_enabled
    }
  }

  if (!siteEnabled) {
    return { ok: true, skipped: true, telegram_notify: false }
  }

  const { data, error } = await supabase.from('jobs').insert({
    title: String(body.title),
    company: String(body.company),
    url: body.url ? String(body.url) : null,
    location: body.location ? String(body.location) : null,
    remote: Boolean(body.remote ?? false),
    status: body.status ?? 'new',
    fit_score: body.fit_score != null ? Number(body.fit_score) : null,
    salary_min: body.salary_min != null ? Number(body.salary_min) : null,
    salary_max: body.salary_max != null ? Number(body.salary_max) : null,
    notes: body.notes ? String(body.notes) : null,
  }).select('id').single()

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return { ok: true, id: data.id, telegram_notify: telegramEnabled }
})
