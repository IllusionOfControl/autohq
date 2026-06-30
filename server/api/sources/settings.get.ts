// Known sources, used to self-heal an empty table so Control always has toggles.
// Seeding only runs when the table is empty; existing rows (and their toggle
// states) are never overwritten.
const DEFAULT_SOURCES = [
  { source_id: 'remotive', label: 'Remotive.com', site_enabled: true, telegram_enabled: true },
  { source_id: 'arbeitnow', label: 'Arbeitnow', site_enabled: true, telegram_enabled: true },
  { source_id: 'hh', label: 'HH.ru', site_enabled: true, telegram_enabled: true },
  { source_id: 'rabota', label: 'rabota.by', site_enabled: true, telegram_enabled: false },
  { source_id: 'djinni', label: 'Djinni', site_enabled: true, telegram_enabled: true },
  { source_id: 'habr', label: 'Хабр Карьера', site_enabled: true, telegram_enabled: true },
]

export default defineEventHandler(async () => {
  const sql = useDb()

  const rows = await sql`
    select source_id, label, site_enabled, telegram_enabled
    from source_settings
    order by source_id
  `
  if (rows.length > 0) return rows

  // Empty table → seed the known sources, then return them.
  await sql`
    insert into source_settings ${sql(DEFAULT_SOURCES, 'source_id', 'label', 'site_enabled', 'telegram_enabled')}
    on conflict (source_id) do nothing
  `
  return await sql`
    select source_id, label, site_enabled, telegram_enabled
    from source_settings
    order by source_id
  `
})
