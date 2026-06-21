export default defineEventHandler(async () => {
  const sql = useDb()
  return await sql`
    select source_id, label, site_enabled, telegram_enabled
    from source_settings
    order by source_id
  `
})
