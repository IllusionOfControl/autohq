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
  const supabase = supabaseAdmin()

  const cols = 'source_id, label, site_enabled, telegram_enabled'
  const { data, error } = await supabase.from('source_settings').select(cols).order('source_id')
  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  if (data && data.length > 0) return data

  // Empty table → seed the known sources, then return them.
  await supabase
    .from('source_settings')
    .upsert(DEFAULT_SOURCES, { onConflict: 'source_id', ignoreDuplicates: true })
  const { data: seeded } = await supabase.from('source_settings').select(cols).order('source_id')
  return seeded ?? []
})
