import type { H3Event } from 'h3'
import { createHash, timingSafeEqual } from 'node:crypto'

/**
 * Shared secret that authenticates n8n → app traffic (the webhook,
 * /api/n8n/* and /api/resume). Backed by AUTOHQ_SECRET_TOKEN; n8n sends it in
 * the `x-autohq-token` header.
 */
export function autohqSecret(): string {
  return process.env.AUTOHQ_SECRET_TOKEN || process.env.NUXT_AUTOHQ_SECRET_TOKEN || ''
}

/**
 * Constant-time check of the `x-autohq-token` header against the configured
 * secret. Returns false when the secret isn't configured or the header is
 * missing. Both sides are hashed first so the compare stays constant-time
 * regardless of input length.
 */
export function hasValidAutohqToken(event: H3Event): boolean {
  const secret = autohqSecret()
  if (!secret) return false
  const provided = getHeader(event, 'x-autohq-token') ?? ''
  const a = createHash('sha256').update(provided).digest()
  const b = createHash('sha256').update(secret).digest()
  return timingSafeEqual(a, b)
}
