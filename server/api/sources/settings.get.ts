import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async () => {
  const supabase = createClient(
    process.env.NUXT_PUBLIC_SUPABASE_URL!,
    process.env.NUXT_PUBLIC_SUPABASE_KEY!,
  )

  const { data, error } = await supabase
    .from('source_settings')
    .select('source_id, label, site_enabled, telegram_enabled')
    .order('source_id')

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return data
})
