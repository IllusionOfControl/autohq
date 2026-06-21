/** Single job (detail page). */
export default defineEventHandler(async (event) => {
  const sql = useDb()
  const id = getRouterParam(event, 'id')

  const [job] = await sql`select * from jobs where id = ${id}`
  if (!job) throw createError({ status: 404, message: 'Job not found' })

  return job
})
