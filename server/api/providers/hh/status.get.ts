/**
 * HH connection status (owner-gated). Never returns the tokens themselves —
 * only whether we're connected and when the access token expires.
 */
export default defineEventHandler(async () => {
  const row = await hhAuthRow()
  const configured = Boolean(process.env.HH_CLIENT_ID && process.env.HH_CLIENT_SECRET)
  return {
    configured,
    connected: Boolean(row?.refresh_token),
    connected_at: row?.connected_at ?? null,
    expires_at: row?.expires_at ?? null,
  }
})
