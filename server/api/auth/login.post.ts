import { readValidatedBody } from 'h3'
import bcrypt from 'bcryptjs'
import { useDb } from '../../utils/db'
import { createSession, SESSION_COOKIE } from '../../utils/session'
import { loginSchema } from '../../../lib/validations'
import { logActivity } from '../../utils/logger'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, loginSchema.parse)
  const db = useDb()

  const ident = String(body.username).trim()
  const res = await db.execute({
    sql: 'SELECT * FROM users WHERE (username = ? OR nip = ?) AND deleted_at IS NULL',
    args: [ident, ident]
  })
  if (res.rows.length === 0) {
    throw createError({ statusCode: 401, statusMessage: 'Username/NIP atau password salah' })
  }
  const user = res.rows[0] as any
  const ok = await bcrypt.compare(body.password, user.password_hash)
  if (!ok) {
    throw createError({ statusCode: 401, statusMessage: 'Username/NIP atau password salah' })
  }
  if (user.status !== 'active') {
    throw createError({ statusCode: 403, statusMessage: 'Akun nonaktif' })
  }

  const ip = getRequestIP(event, { xForwardedFor: true }) ?? ''
  const ua = getRequestHeader(event, 'user-agent') ?? ''
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

  return {
    user: {
      id: user.id,
      nama: user.nama,
      username: user.username,
      role: user.role,
      status: user.status
    }
  }
})
