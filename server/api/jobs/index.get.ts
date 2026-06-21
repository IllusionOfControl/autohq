/**
 * List jobs for the dashboard, tracker and applications pages.
 * Optional ?status=a,b,c filters by status (used by /applications).
 */
export default defineEventHandler(async (event) => {
  const sql = useDb()
  const { status } = getQuery(event)

  const list = typeof status === 'string' && status.length
    ? status.split(',').map(s => s.trim()).filter(Boolean)
    : null

  return await sql`
    select id, title, company, location, remote, status, fit_score,
           salary_min, salary_max, created_at, applied_at, url, source
    from jobs
    ${list ? sql`where status in ${sql(list)}` : sql``}
    order by created_at desc
  `
})
