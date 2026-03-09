// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  // This app is an offline-first PWA intended to run on mobile devices.
  // SSR is incompatible with offline mode — the app must render entirely
  // client-side so the service worker can serve it without a network.
  ssr: false,
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/ui', 'nuxt-auth-utils'],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    geminiApiKey: '',
  },
  nitro: {
    storage: {
      local: {
        driver: 'fs-lite',
        base: './data/local',
      },
    },
  },
})
