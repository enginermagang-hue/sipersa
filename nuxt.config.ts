// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      title: process.env.NUXT_PUBLIC_APP_NAME || 'SIPERSA',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Aplikasi Surat Masuk/Keluar, Disposisi & Arsip' }
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap' }
      ]
    }
  },
  runtimeConfig: {
    tursoUrl: '',
    tursoAuthToken: '',
    dropboxToken: '',
    dropboxAppKey: '',
    dropboxAppSecret: '',
    dropboxRefreshToken: '',
    googleClientId: '',
    googleClientSecret: '',
    googleRedirectUri: '',
    sessionSecret: '',
    sessionMaxAge: 86400,
    instansiNama: '',
    instansiUnit: '',
    appName: process.env.NUXT_PUBLIC_APP_NAME || 'SIPERSA'
  },
  nitro: {
    bodySize: 25,
    routeRules: {
      '/api/**': { csr: false }
    }
  }
})
