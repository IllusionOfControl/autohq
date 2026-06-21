/** Manually create a job (the "Add Job" form). */
export default defineEventHandler(async (event) => {
  const sql = useDb()
  const body = await readBody(event)

  if (!body?.title || !body?.company) {
    throw createError({ status: 400, message: 'title and company are required' })
  }

  const row = {
    title: String(body.title),
    company: String(body.company),
    url: body.url || null,
    location: body.location || null,
    remote: Boolean(body.remote ?? false),
    status: body.status ?? 'new',
    fit_score: body.fit_score ?? null,
    salary_min: body.salary_min ?? null,
    salary_max: body.salary_max ?? null,
    notes: body.notes || null,
  }

  const [created] = await sql`insert into jobs ${sql(row)} returning *`
  if (!created) throw createError({ status: 500, message: 'Insert failed' })
  return created
})
