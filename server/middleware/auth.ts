import { getCookie } from 'h3'
import { SESSION_COOKIE, getSessionUser } from '../utils/session'

export default defineEventHandler(async (event) => {
  const path = event.path
  if (!path.startsWith('/api/')) return
  if (path === '/api/auth/login') return
  if (path.startsWith('/api/auth/google')) return
  if (path.startsWith('/api/whatsapp/webhook')) return

  const token = getCookie(event, SESSION_COOKIE)
  const user = await getSessionUser(token)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  if (user.status !== 'active') {
    throw createError({ statusCode: 403, statusMessage: 'Akun nonaktif' })
  }
  event.context.auth = user
})
