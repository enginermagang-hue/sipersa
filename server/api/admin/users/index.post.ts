import { useDb } from '../../../utils/db'
import { userCreateSchema } from '../../../../lib/validations'
import bcrypt from 'bcryptjs'
import { logActivity } from '../../../utils/logger'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  if (auth.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Hanya admin' })
  const body = await readBody(event)
  const parsed = userCreateSchema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: 'Data tidak valid', data: parsed.error.issues })
  const d = parsed.data

  const db = useDb()
  const usernameNorm = d.username.trim().toLowerCase()
  const exist = await db.execute({ sql: 'SELECT id FROM users WHERE LOWER(TRIM(username)) = ? AND deleted_at IS NULL LIMIT 1', args: [usernameNorm] })
  if (exist.rows.length > 0) throw createError({ statusCode: 409, statusMessage: 'Username sudah dipakai' })

  const emailNorm = d.email ? d.email.trim().toLowerCase() : null
  if (emailNorm) {
    const dup = await db.execute({ sql: `SELECT id FROM users WHERE LOWER(TRIM(email)) = ? AND deleted_at IS NULL LIMIT 1`, args: [emailNorm] })
    if (dup.rows.length > 0) throw createError({ statusCode: 409, statusMessage: 'Email sudah dipakai' })
  }

  const hash = await bcrypt.hash(d.password, 10)
  const res = await db.execute({
    sql: 'INSERT INTO users (nama, username, email, password_hash, role, status, nip, no_hp, jabatan) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    args: [d.nama, usernameNorm, emailNorm, hash, d.role, 'active', d.nip || null, d.no_hp || null, d.jabatan || null]
  })
  await logActivity({ userId: auth.userId, action: 'CREATE_USER', entity: 'users', entityId: Number(res.lastInsertRowid), ip: getRequestIP(event, { xForwardedFor: true }) })
  return { id: Number(res.lastInsertRowid) }
})
