/**
 * HH.ru OAuth helper — token exchange, storage, and auto-refresh.
 *
 * The app stores only the tokens (provider_auth table). The client id/secret
 * live in env (HH_CLIENT_ID / HH_CLIENT_SECRET) so the secret never touches the
 * DB or git.
 *
 * Flow (manual-paste, because the provided client redirects to the mobile
 * scheme hhandroid://oauthresponse?token=<CODE> rather than a web callback):
 *   1. user opens hhAuthorizeUrl() in a browser, logs in, authorizes
 *   2. HH redirects to hhandroid://...?token=<CODE>; user copies <CODE>
 *   3. exchangeHhCode(<CODE>) swaps it for access_token + refresh_token
 *
 * HH requires a User-Agent on every api.hh.ru request, including /token.
 */
const TOKEN_URL = 'https://api.hh.ru/token'
const AUTHORIZE_URL = 'https://hh.ru/oauth/authorize'
const USER_AGENT = 'AutoHQ-JobBot/1.0 (autohq)'

// Refresh a bit early so n8n never receives an already-expired token.
const REFRESH_MARGIN_MS = 60_000

export interface HhCreds { clientId: string; clientSecret: string }

interface HhTokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

interface ProviderAuthRow {
  provider: string
  access_token: string | null
  refresh_token: string | null
  expires_at: string | null
  scope: string | null
  connected_at: string | null
}

/** Read client credentials from env, or throw a clear error if unconfigured. */
export function hhCreds(): HhCreds {
  const clientId = process.env.HH_CLIENT_ID
  const clientSecret = process.env.HH_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw createError({
      status: 500,
      message: 'HH_CLIENT_ID / HH_CLIENT_SECRET are not configured',
    })
  }
  return { clientId, clientSecret }
}

/** Browser URL that starts the OAuth consent. */
export function hhAuthorizeUrl(): string {
  const { clientId } = hhCreds()
  const qs = new URLSearchParams({ response_type: 'code', client_id: clientId })
  return `${AUTHORIZE_URL}?${qs}`
}

/** POST to HH's /token endpoint (form-urlencoded) and parse the response. */
async function postToken(params: Record<string, string>): Promise<HhTokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    },
    body: new URLSearchParams(params).toString(),
  })
  const text = await res.text()
  if (!res.ok) {
    throw createError({ status: 502, message: `HH token request failed (${res.status}): ${text}` })
  }
  return JSON.parse(text) as HhTokenResponse
}

/** Persist a token response to provider_auth, computing expires_at. */
async function storeTokens(tok: HhTokenResponse, opts: { isNew?: boolean } = {}) {
  const sql = useDb()
  const expiresAt = new Date(Date.now() + tok.expires_in * 1000).toISOString()
  const row: Record<string, unknown> = {
    provider: 'hh',
    access_token: tok.access_token,
    refresh_token: tok.refresh_token,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  }
  if (opts.isNew) row.connected_at = new Date().toISOString()
  const cols = Object.keys(row).filter(c => c !== 'provider')
  await sql`
    insert into provider_auth ${sql(row)}
    on conflict (provider) do update set ${sql(row, ...cols)}
  `
}

/** Exchange a freshly obtained authorization code for tokens (step 3). */
export async function exchangeHhCode(code: string) {
  const { clientId, clientSecret } = hhCreds()
  const tok = await postToken({
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    code,
  })
  await storeTokens(tok, { isNew: true })
}

/**
 * Refresh using the stored refresh_token. HH refresh tokens are single-use:
 * the response carries a *new* refresh_token, so we always persist both.
 */
async function refreshHhTokens(refreshToken: string) {
  const tok = await postToken({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  })
  await storeTokens(tok)
  return tok.access_token
}

/** The stored HH row, or null if never connected. */
export async function hhAuthRow(): Promise<ProviderAuthRow | null> {
  const sql = useDb()
  const [row] = await sql<ProviderAuthRow[]>`
    select provider, access_token, refresh_token, expires_at, scope, connected_at
    from provider_auth where provider = 'hh'
  `
  return row ?? null
}

/**
 * A valid HH access token, refreshing if it's expired/near-expiry.
 * Returns null when HH isn't connected (callers fall back to anonymous use).
 */
export async function getValidHhAccessToken(): Promise<string | null> {
  const row = await hhAuthRow()
  if (!row?.access_token || !row.refresh_token) return null

  const expMs = row.expires_at ? new Date(row.expires_at).getTime() : 0
  if (expMs - REFRESH_MARGIN_MS > Date.now()) return row.access_token

  // Expired or about to — refresh. If the refresh itself fails, surface null
  // rather than throwing, so a stale token never breaks the n8n run.
  try {
    return await refreshHhTokens(row.refresh_token)
  } catch {
    return null
  }
}
