/** Delete a single job. */
export default defineEventHandler(async (event) => {
  const sql = useDb()
  const id = getRouterParam(event, 'id')

  await sql`delete from jobs where id = ${id}`
  return { ok: true }
})
