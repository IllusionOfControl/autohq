/** Bulk status change (table view: "Move to…" / Archive). Body: { ids, patch }. */
const ALLOWED = ['status', 'applied_at'] as const

export default defineEventHandler(async (event) => {
  const sql = useDb()
  const { ids, patch } = await readBody(event)

  if (!Array.isArray(ids) || ids.length === 0) {
    throw createError({ status: 400, message: 'ids are required' })
  }

  const updates: Record<string, unknown> = {}
  for (const key of ALLOWED) {
    if (patch && key in patch) updates[key] = patch[key]
  }

  if (Object.keys(updates).length === 0) {
    throw createError({ status: 400, message: 'No valid fields to update' })
  }

  await sql`update jobs set ${sql(updates)} where id in ${sql(ids)}`
  return { ok: true }
})
