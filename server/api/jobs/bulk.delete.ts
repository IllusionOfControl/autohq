/** Bulk delete (table view selection + board card delete). Body: { ids }. */
export default defineEventHandler(async (event) => {
  const sql = useDb()
  const { ids } = await readBody(event)

  if (!Array.isArray(ids) || ids.length === 0) {
    throw createError({ status: 400, message: 'ids are required' })
  }

  await sql`delete from jobs where id in ${sql(ids)}`
  return { ok: true }
})
