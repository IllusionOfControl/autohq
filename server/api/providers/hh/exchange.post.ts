/**
 * Exchange a pasted HH authorization code for tokens (owner-gated).
 * The code is the `token` value from the hhandroid://...?token=<CODE> redirect.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const code = typeof body?.code === 'string' ? body.code.trim() : ''
  if (!code) {
    throw createError({ status: 400, message: 'code is required' })
  }

  await exchangeHhCode(code)
  return { ok: true }
})
