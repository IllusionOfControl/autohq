import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const sourceId = getRouterParam(event, 'id')
  const body = await readBody(event)

  const allowed = ['site_enabled', 'telegram_enabled']
  const updates: Record<string, boolean> = {}
  for (const key of allowed) {
    if (key in body && typeof body[key] === 'boolean') {
      updates[key] = body[key]
    }
  }

  if (Object.keys(updates).length === 0) {
    throw createError({ statusCode: 400, message: 'No valid fields to update' })
  }

  updates.updated_at = new Date().toISOString() as any

  const supabase = createClient(
    process.env.NUXT_PUBLIC_SUPABASE_URL!,
    process.env.NUXT_PUBLIC_SUPABASE_KEY!,
  )

  const { error } = await supabase
    .from('source_settings')
    .update(updates)
    .eq('source_id', sourceId)

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return { ok: true }
})
