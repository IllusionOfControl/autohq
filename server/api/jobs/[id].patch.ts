import type { Job } from '#shared/types/job'

/** Partial update of a single job (edit form, quick status change, drag & drop). */
const ALLOWED = [
  'title', 'company', 'url', 'location', 'remote', 'status', 'fit_score',
  'salary_min', 'salary_max', 'notes', 'applied_at',
  'description', 'cover_letter', 'score_reason',
] as const

export default defineEventHandler(async (event) => {
  const sql = useDb()
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ status: 400, message: 'id is required' })
  const body = (await readBody(event)) ?? {}

  const updates: Record<string, unknown> = {}
  for (const key of ALLOWED) {
    if (key in body) updates[key] = body[key] === '' ? null : body[key]
  }

  if (Object.keys(updates).length === 0) {
    throw createError({ status: 400, message: 'No valid fields to update' })
  }

  const [updated] = await sql<Job[]>`update jobs set ${sql(updates)} where id = ${id} returning *`
  if (!updated) throw createError({ status: 404, message: 'Job not found' })

  return updated
})
