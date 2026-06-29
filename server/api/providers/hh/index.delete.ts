/** Disconnect HH — drop the stored tokens (owner-gated). */
export default defineEventHandler(async () => {
  const sql = useDb()
  await sql`delete from provider_auth where provider = 'hh'`
  return { ok: true }
})
