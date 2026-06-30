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
    autohqSecretToken: process.env.AUTOHQ_SECRET_TOKEN ?? '',
    public: {
      useSampleData: false,
      n8nUrl: '',          // example: https://n8n.example.com
      telegramBot: '',     // example: @myfirstgmailbot
      appUrl: '',          // public origin for webhook URL; empty = current origin
    },
  },

  typescript: {
    strict: true,
  },
})
