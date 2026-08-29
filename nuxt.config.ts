// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  icon: {
    serverBundle: {
      collections: ['lucide']
    }
  },
  app: {
    head: {
      title: process.env.NUXT_PUBLIC_APP_NAME || 'SIPERSA',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=5' },
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
    fonnteToken: process.env.NUXT_FONNTE_TOKEN || process.env.NUXT_FONTE_TOKEN || '',
    fonnteEnabled: process.env.NUXT_FONNTE_ENABLED || process.env.NUXT_FONTE_ENABLED || false,
    fonnteBaseUrl: process.env.NUXT_FONNTE_BASE_URL || 'https://api.fonnte.com/send',
    appUrl: process.env.NUXT_APP_URL || '',
    appName: process.env.NUXT_PUBLIC_APP_NAME || 'SIPERSA',
    public: {
      klasifikasiGoogleUrl: process.env.NUXT_KLASIFIKASI_GOOGLE_URL || 'https://script.google.com/macros/s/AKfycby4RoU3dPXZWfkofZ5wVkNRKyG_V4x23ypfl-bRyrx7ahZ3i_NvFJ4lBntAANhiXjFyQQ/exec',
      instansiNama: process.env.NUXT_PUBLIC_INSTANSI_NAMA || '',
      instansiUnit: process.env.NUXT_PUBLIC_INSTANSI_UNIT || '',
      instansiSubUnit: process.env.NUXT_PUBLIC_INSTANSI_SUB_UNIT || '',
      instansiAlamat: process.env.NUXT_PUBLIC_INSTANSI_ALAMAT || '',
      logoPath: process.env.NUXT_PUBLIC_LOGO_PATH || '',
      nomorTU: process.env.NUXT_PUBLIC_NOMOR_TU || 'TU',
      nomorUnit: process.env.NUXT_PUBLIC_NOMOR_UNIT || 'tekkomdik'
    }
  },
  nitro: {
    bodySize: 25,
    routeRules: {
      '/api/**': { csr: false }
    }
  }
})
