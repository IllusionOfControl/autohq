/**
 * Server-side gate for the data API — the replacement for Supabase RLS.
 *
 * Every /api/* route requires a valid session, except:
 *   - /api/_auth/*  — nuxt-auth-utils' own session endpoints
 *   - /api/auth/*   — (reserved) auth helpers
 *   - /api/webhook/*— authenticated by its own shared secret (n8n)
 *   - /api/n8n/*    — authenticated by the same shared secret (n8n)
 *   - /api/resume   — read-only, also consumed by n8n
 */
const PUBLIC_PREFIXES = ['/api/_auth', '/api/auth', '/api/webhook', '/api/n8n', '/api/resume']

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname
  if (!path.startsWith('/api/')) return
  if (PUBLIC_PREFIXES.some(p => path === p || path.startsWith(p + '/'))) return

  await requireUserSession(event)
})
