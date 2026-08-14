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
  const exist = await db.execute({ sql: 'SELECT id FROM users WHERE username = ? AND deleted_at IS NULL', args: [d.username] })
  if (exist.rows.length > 0) throw createError({ statusCode: 409, statusMessage: 'Username sudah dipakai' })

  const hash = await bcrypt.hash(d.password, 10)
  const res = await db.execute({
    sql: 'INSERT INTO users (nama, username, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?, ?)',
    args: [d.nama, d.username, d.email || null, hash, d.role, 'active']
  })
  await logActivity({ userId: auth.userId, action: 'CREATE_USER', entity: 'users', entityId: Number(res.lastInsertRowid), ip: getRequestIP(event, { xForwardedFor: true }) })
  return { id: Number(res.lastInsertRowid) }
})
