export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const updates: Record<string, unknown> = {}
  if (typeof body?.keywords === 'string') {
    updates.keywords = body.keywords.trim()
  }
  if (body?.telegram_min_score != null) {
    const n = Number(body.telegram_min_score)
    if (Number.isFinite(n)) updates.telegram_min_score = Math.min(100, Math.max(0, Math.round(n)))
  }

  if (Object.keys(updates).length === 0) {
    throw createError({ statusCode: 400, message: 'No valid fields to update' })
  }
  updates.updated_at = new Date().toISOString()

  const supabase = supabaseAdmin()

  const { error } = await supabase
    .from('app_config')
    .upsert({ id: 1, ...updates })

  if (error) throw createError({ statusCode: 500, message: error.message })
  return { ok: true }
})
