import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxtjs/color-mode',
    '@vueuse/nuxt',
    '@pinia/nuxt',
    '@nuxtjs/supabase',
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

  supabase: {
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: ['/login', '/confirm'],
    },
  },

  runtimeConfig: {
    webhookSecret: process.env.WEBHOOK_SECRET ?? '',
    supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY ?? '',
  },

  typescript: {
    strict: true,
  },
})
