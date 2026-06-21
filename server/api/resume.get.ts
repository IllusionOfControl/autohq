/**
 * Live resume fetch from a private GitHub repo (e.g. an Obsidian vault).
 * Source of truth lives in the repo; this reads the current markdown so the
 * app always shows what's there.
 *
 * Configured via env vars:
 *   RESUME_REPO     — "owner/repo" of the private repo (required)
 *   RESUME_PATH_EN  — path to the English markdown inside the repo
 *   RESUME_PATH_RU  — path to the Russian markdown inside the repo
 *   GITHUB_TOKEN    — token with read access to the repo (required)
 */
const REPO = process.env.RESUME_REPO || process.env.NUXT_RESUME_REPO || ''
const PATHS: Record<string, string> = {
  en: process.env.RESUME_PATH_EN || process.env.NUXT_RESUME_PATH_EN || '',
  ru: process.env.RESUME_PATH_RU || process.env.NUXT_RESUME_PATH_RU || '',
}

function contentsUrl(path: string): string {
  return `https://api.github.com/repos/${REPO}/contents/${encodeURI(path)}`
}

async function fetchRaw(path: string, token: string): Promise<string> {
  return $fetch<string>(contentsUrl(path), {
    headers: { Authorization: `token ${token}`, 'User-Agent': 'AutoHQ', Accept: 'application/vnd.github.raw' },
    responseType: 'text',
  })
}

export default defineEventHandler(async (event) => {
  const q = (getQuery(event).lang as string) || 'en'
  const token = process.env.GITHUB_TOKEN || process.env.NUXT_GITHUB_TOKEN

  if (!REPO) {
    return q === 'both'
      ? { en: '', ru: '', error: 'no-repo' }
      : { lang: q === 'ru' ? 'ru' : 'en', path: '', content: '', error: 'no-repo' }
  }

  // n8n convenience: both resumes in one call
  if (q === 'both') {
    if (!token) return { en: '', ru: '', error: 'no-token' }
    if (!PATHS.en || !PATHS.ru) return { en: '', ru: '', error: 'no-path' }
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
  if (!path) {
    return { lang, path, content: '', error: 'no-path' }
  }

  const headers = {
    Authorization: `token ${token}`,
    'User-Agent': 'AutoHQ',
  }

  try {
    const content = await fetchRaw(path, token)

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
    const status = e?.response?.status ?? e?.status
    return { lang, path, content: '', error: status === 404 ? 'not-found' : 'fetch-failed' }
  }
})
