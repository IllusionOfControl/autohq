export default defineEventHandler(async (event) => {
  const sourceId = getRouterParam(event, 'id')
  const body = await readBody(event)

  const allowed = ['site_enabled', 'telegram_enabled']
  const updates: Record<string, boolean | string> = {}
  for (const key of allowed) {
    if (key in body && typeof body[key] === 'boolean') {
      updates[key] = body[key]
    }
  }

  if (Object.keys(updates).length === 0) {
    throw createError({ status: 400, message: 'No valid fields to update' })
  }

  updates.updated_at = new Date().toISOString()

  const sql = useDb()
  await sql`
    update source_settings set ${sql(updates)} where source_id = ${sourceId}
  `

  return { ok: true }
})
