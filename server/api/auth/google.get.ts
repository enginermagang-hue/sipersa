import { getQuery } from 'h3'
import { getGoogleConfig, getGoogleAuthUrl } from '../../utils/google-oauth'
import { newStateToken, setGoogleStateCookie } from '../../utils/google-state'

export default defineEventHandler((event) => {
  let config
  try {
    config = getGoogleConfig()
  } catch {
    return sendRedirect(event, '/login?error=google-config')
  }

  const query = getQuery(event) as any
  if (query.popup === '1') {
    setCookie(event, 'google_oauth_popup', '1', {
      httpOnly: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 600,
      secure: !import.meta.dev
    })
  }

  const state = newStateToken()
  setGoogleStateCookie(event, state)
  return sendRedirect(event, getGoogleAuthUrl(state, config))
})
