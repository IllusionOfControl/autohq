/** Delete a single job. */
export default defineEventHandler(async (event) => {
  const sql = useDb()
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ status: 400, message: 'id is required' })

  await sql`delete from jobs where id = ${id}`
  return { ok: true }
})
