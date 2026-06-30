import type { Job } from '#shared/types/job'

/** Single job (detail page). */
export default defineEventHandler(async (event) => {
  const sql = useDb()
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ status: 400, message: 'id is required' })

  const [job] = await sql<Job[]>`select * from jobs where id = ${id}`
  if (!job) throw createError({ status: 404, message: 'Job not found' })

  return job
})
