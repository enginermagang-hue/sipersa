const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo'

export function getGoogleConfig() {
  const config = useRuntimeConfig()
  if (!config.googleClientId || !config.googleClientSecret || !config.googleRedirectUri) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Konfigurasi Google OAuth belum diatur (NUXT_GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI)'
    })
  }
  return {
    clientId: config.googleClientId,
    clientSecret: config.googleClientSecret,
    redirectUri: config.googleRedirectUri
  }
}

export function getGoogleAuthUrl(state: string, config = getGoogleConfig()) {
  const { clientId, redirectUri } = config
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
    access_type: 'online'
  })
  return `${GOOGLE_AUTH_URL}?${params.toString()}`
}

export async function exchangeCodeForToken(code: string) {
  const { clientId, clientSecret, redirectUri } = getGoogleConfig()
  const res: any = await $fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    }).toString()
  })
  if (!res.access_token) {
    throw createError({ statusCode: 401, statusMessage: 'Gagal menukar kode OAuth Google' })
  }
  return res
}

export async function getGoogleUser(accessToken: string) {
  const res: any = await $fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  if (!res.sub || !res.email || res.email_verified !== true) {
    throw createError({ statusCode: 401, statusMessage: 'Akun Google tidak valid atau email belum diverifikasi' })
  }
  return {
    googleId: res.sub as string,
    email: res.email as string,
    nama: (res.name || res.email.split('@')[0]) as string
  }
}
