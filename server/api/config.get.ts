const DEFAULTS = {
  // Plain space-separated terms; each n8n workflow adapts the syntax
  // (HH -> " OR ", Djinni -> "+", Remotive -> as-is).
  keywords: 'vue nuxt typescript frontend',
  telegram_min_score: 70,
}

/**
 * Runtime config consumed by both the UI and n8n.
 * Resilient: returns defaults if the app_config table doesn't exist yet,
 * so the dashboard never 500s before the migration is applied.
 */
export default defineEventHandler(async () => {
  try {
    const supabase = supabaseAdmin()
    const { data, error } = await supabase
      .from('app_config')
      .select('keywords, telegram_min_score')
      .eq('id', 1)
      .single()

    if (error || !data) return DEFAULTS
    return {
      keywords: data.keywords ?? DEFAULTS.keywords,
      telegram_min_score: data.telegram_min_score ?? DEFAULTS.telegram_min_score,
    }
  } catch {
    return DEFAULTS
  }
})
