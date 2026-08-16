import { getQuery } from 'h3'
import { useDb } from '../../../utils/db'
import { createSession, SESSION_COOKIE } from '../../../utils/session'
import { exchangeCodeForToken, getGoogleUser } from '../../../utils/google-oauth'
import { GOOGLE_STATE_COOKIE, getGoogleStateCookie } from '../../../utils/google-state'
import { logActivity } from '../../../utils/logger'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const error = query.error

  if (error) {
    if (error === 'access_denied') {
      return sendRedirect(event, '/login?error=google-cancelled')
    }
    return sendRedirect(event, '/login?error=google')
  }

  const code = typeof query.code === 'string' ? query.code : ''
  const state = typeof query.state === 'string' ? query.state : ''
  const stateCookie = getGoogleStateCookie(event)

  if (!code || !state || state !== stateCookie) {
    deleteCookie(event, GOOGLE_STATE_COOKIE)
    return sendRedirect(event, '/login?error=google')
  }
  deleteCookie(event, GOOGLE_STATE_COOKIE)

  const db = useDb()
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? ''
  const ua = getRequestHeader(event, 'user-agent') ?? ''

  let googleUser
  try {
    const tokens = await exchangeCodeForToken(code)
    googleUser = await getGoogleUser(tokens.access_token)
  } catch (e: any) {
    console.error('Google token/userinfo error:', e)
    return sendRedirect(event, '/login?error=google')
  }

  try {
    const res = await db.execute({
      sql: `SELECT * FROM users WHERE (google_id = ? OR email = ?) AND deleted_at IS NULL`,
      args: [googleUser.googleId, googleUser.email]
    })
    if (res.rows.length === 0) {
      return sendRedirect(event, '/login?error=google-unregistered')
    }
    const user = res.rows[0] as any
    if (user.status !== 'active') {
      return sendRedirect(event, '/login?error=google-inactive')
    }

    if (user.google_id !== googleUser.googleId) {
      await db.execute({
        sql: 'UPDATE users SET google_id = ? WHERE id = ?',
        args: [googleUser.googleId, user.id]
      })
    }

    const { token, expires } = await createSession(user.id, ip, ua)
    await db.execute({
      sql: `UPDATE users SET last_login = datetime('now') WHERE id = ?`,
      args: [user.id]
    })
    await logActivity({ userId: user.id, action: 'LOGIN', entity: 'users', entityId: user.id, ip })

    setCookie(event, SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      expires: new Date(expires),
      secure: !import.meta.dev
    })

    return sendRedirect(event, '/')
  } catch (e: any) {
    console.error('Google login DB error:', e)
    return sendRedirect(event, '/login?error=google')
  }
})
