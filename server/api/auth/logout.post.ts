import { getCookie } from 'h3'
import { SESSION_COOKIE, destroySession } from '../../utils/session'
import { logActivity } from '../../utils/logger'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  const token = getCookie(event, SESSION_COOKIE)
  await destroySession(token)
  if (auth) {
    await logActivity({ userId: auth.userId, action: 'LOGOUT', entity: 'users', entityId: auth.userId })
  }
  deleteCookie(event, SESSION_COOKIE)
  return { ok: true }
})
