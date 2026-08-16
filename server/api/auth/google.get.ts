import { getGoogleConfig, getGoogleAuthUrl } from '../../utils/google-oauth'
import { newStateToken, setGoogleStateCookie } from '../../utils/google-state'

export default defineEventHandler((event) => {
  let config
  try {
    config = getGoogleConfig()
  } catch {
    return sendRedirect(event, '/login?error=google-config')
  }

  const state = newStateToken()
  setGoogleStateCookie(event, state)
  return sendRedirect(event, getGoogleAuthUrl(state, config))
})
