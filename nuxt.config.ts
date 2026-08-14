// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      title: 'Sistem Persuratan',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Aplikasi Surat Masuk/Keluar, Disposisi & Arsip' }
      ]
    }
  },
  runtimeConfig: {
    tursoUrl: '',
    tursoAuthToken: '',
    dropboxToken: '',
    sessionSecret: '',
    sessionMaxAge: 86400
  },
  nitro: {
    bodySize: 25,
    routeRules: {
      '/api/**': { csr: false }
    }
  }
})
