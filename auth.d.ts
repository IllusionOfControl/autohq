// Shape of the user stored in the session cookie (nuxt-auth-utils).
declare module '#auth-utils' {
  interface User {
    login?: string
    name?: string
    avatar?: string
  }
}

export {}
