/**
 * GitHub OAuth callback.
 *
 * nuxt-auth-utils handles the OAuth dance; here we enforce the owner-gate
 * (only OWNER_GITHUB may sign in) and store a minimal user in the encrypted
 * session cookie. Visiting /auth/github with no code starts the flow.
 */
export default defineOAuthGitHubEventHandler({
  config: {
    emailRequired: false,
  },
  async onSuccess(event, { user }) {
    const owner = process.env.OWNER_GITHUB
    const login = user.login as string | undefined

    if (owner && login?.toLowerCase() !== owner.toLowerCase()) {
      return sendRedirect(event, '/login?denied=1')
    }

    await setUserSession(event, {
      user: {
        login,
        name: (user.name as string) ?? login,
        avatar: user.avatar_url as string | undefined,
      },
    })

    return sendRedirect(event, '/')
  },
  onError(event) {
    return sendRedirect(event, '/login?error=1')
  },
})
