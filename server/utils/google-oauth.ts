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
  if (!res.access_token || !res.id_token) {
    throw createError({ statusCode: 401, statusMessage: 'Gagal menukar kode OAuth Google' })
  }
  return res as { access_token: string; id_token: string; expires_in?: number; token_type?: string; scope?: string }
}

export async function verifyIdToken(idToken: string) {
  const config = getGoogleConfig()
  let info: any
  try {
    info = await $fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`)
  } catch {
    throw createError({ statusCode: 401, statusMessage: 'Token Google tidak valid (tokeninfo gagal)' })
  }
  if (!info.sub || !info.email) {
    throw createError({ statusCode: 401, statusMessage: 'Token Google tidak valid (klaim hilang)' })
  }
  if (info.aud !== config.clientId) {
    throw createError({ statusCode: 401, statusMessage: 'Token Google tidak valid (audience mismatch)' })
  }
  const validIss = ['accounts.google.com', 'https://accounts.google.com']
  if (!validIss.includes(info.iss)) {
    throw createError({ statusCode: 401, statusMessage: 'Token Google tidak valid (issuer mismatch)' })
  }
  const expMs = Number(info.exp) * 1000
  if (!expMs || expMs < Date.now()) {
    throw createError({ statusCode: 401, statusMessage: 'Token Google kedaluwarsa' })
  }
  const verified = info.email_verified === true || info.email_verified === 'true'
  if (!verified) {
    throw createError({ statusCode: 401, statusMessage: 'Akun Google tidak valid atau email belum diverifikasi' })
  }
  return {
    googleId: info.sub as string,
    email: (info.email as string).trim().toLowerCase(),
    nama: (info.name || (info.email as string).split('@')[0]) as string,
    raw: info
  }
}

export async function getGoogleUser(accessToken: string) {
  const res: any = await $fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  const verified = res.email_verified === true || res.email_verified === 'true'
  if (!res.sub || !res.email || !verified) {
    throw createError({ statusCode: 401, statusMessage: 'Akun Google tidak valid atau email belum diverifikasi' })
  }
  return {
    googleId: res.sub as string,
    email: (res.email as string).trim().toLowerCase(),
    nama: (res.name || res.email.split('@')[0]) as string
  }
}

export async function getGoogleUserFromTokens(tokens: { access_token: string; id_token: string }) {
  const fromId = await verifyIdToken(tokens.id_token)
  let fromInfo: { googleId: string; email: string; nama: string } | null = null
  try {
    fromInfo = await getGoogleUser(tokens.access_token)
  } catch (e: any) {
    if (fromId) return fromId
    throw e
  }
  if (fromInfo.googleId !== fromId.googleId || fromInfo.email.toLowerCase() !== fromId.email.toLowerCase()) {
    throw createError({ statusCode: 401, statusMessage: 'Data Google tidak konsisten (id_token vs userinfo)' })
  }
  return fromId
}
