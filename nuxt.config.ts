import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxtjs/color-mode',
    '@vueuse/nuxt',
    '@pinia/nuxt',
    'nuxt-auth-utils',
    '@nuxt/icon',
  ],

  vite: {
    plugins: [tailwindcss()],
  },

  css: ['~/assets/css/tailwind.css'],

  colorMode: {
    classSuffix: '',
    preference: 'dark',
    fallback: 'dark',
  },

  runtimeConfig: {
    webhookSecret: process.env.WEBHOOK_SECRET ?? '',
    ownerGithub: process.env.OWNER_GITHUB ?? '',
  },

  typescript: {
    strict: true,
  },
})
