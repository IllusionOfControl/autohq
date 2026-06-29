/** The browser URL that starts HH's OAuth consent (owner-gated). */
export default defineEventHandler(() => {
  return { url: hhAuthorizeUrl() }
})
