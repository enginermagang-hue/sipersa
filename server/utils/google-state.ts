export const GOOGLE_STATE_COOKIE = 'google_oauth_state'
export const GOOGLE_STATE_MAX_AGE = 10 * 60

export function newStateToken(): string {
  return crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
}

export function setGoogleStateCookie(event: any, state: string) {
  setCookie(event, GOOGLE_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: GOOGLE_STATE_MAX_AGE,
    secure: !import.meta.dev
  })
}

export function getGoogleStateCookie(event: any): string | undefined {
  return getCookie(event, GOOGLE_STATE_COOKIE)
}
