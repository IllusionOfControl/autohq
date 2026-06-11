/**
 * Live resume fetch from the Obsidian vault (private GitHub repo).
 * Source of truth lives in Obsidian; this reads the current markdown so the
 * app always shows what's in the vault.
 */
const REPO = 'CredoRevolution/obsidian-git-sync'
const PATHS: Record<string, string> = {
  en: 'Personal/Resume EN.md',
  ru: 'Personal/Resume RU.md',
}

async function fetchRaw(path: string, token: string): Promise<string> {
  return $fetch<string>(`https://api.github.com/repos/${REPO}/contents/${encodeURI(path)}`, {
    headers: { Authorization: `token ${token}`, 'User-Agent': 'AutoHQ', Accept: 'application/vnd.github.raw' },
    responseType: 'text',
  })
}

export default defineEventHandler(async (event) => {
  const q = (getQuery(event).lang as string) || 'en'
  const token = process.env.GITHUB_TOKEN || process.env.NUXT_GITHUB_TOKEN

  // n8n convenience: both resumes in one call
  if (q === 'both') {
    if (!token) return { en: '', ru: '', error: 'no-token' }
    try {
      const [en, ru] = await Promise.all([fetchRaw(PATHS.en, token), fetchRaw(PATHS.ru, token)])
      return { en, ru, error: null }
    } catch {
      return { en: '', ru: '', error: 'fetch-failed' }
    }
  }

  const lang = q === 'ru' ? 'ru' : 'en'
  const path = PATHS[lang]

  if (!token) {
    return { lang, path, content: '', error: 'no-token' }
  }

  const api = `https://api.github.com/repos/${REPO}/contents/${encodeURI(path)}`
  const headers = {
    Authorization: `token ${token}`,
    'User-Agent': 'AutoHQ',
  }

  try {
    const content = await $fetch<string>(api, {
      headers: { ...headers, Accept: 'application/vnd.github.raw' },
      responseType: 'text',
    })

    // Best-effort: last commit date for this file (so we can show "updated …")
    let updated: string | null = null
    try {
      const commits = await $fetch<any[]>(
        `https://api.github.com/repos/${REPO}/commits?path=${encodeURIComponent(path)}&per_page=1`,
        { headers: { ...headers, Accept: 'application/vnd.github+json' } },
      )
      updated = commits?.[0]?.commit?.committer?.date ?? null
    } catch { /* ignore */ }

    return { lang, path, content, updated, error: null }
  } catch (e: any) {
    const status = e?.response?.status ?? e?.statusCode
    return { lang, path, content: '', error: status === 404 ? 'not-found' : 'fetch-failed' }
  }
})
