// Auth-gate. The owner check itself happens server-side in the OAuth callback
// (server/routes/auth/github.get.ts), so here we only redirect anonymous
// visitors to the login page.
export default defineNuxtRouteMiddleware((to) => {
  // Auth-flow pages are always allowed
  if (to.path === '/login') return

  const { loggedIn } = useUserSession()
  if (!loggedIn.value) return navigateTo('/login')
})
