import { useDb } from '../../../utils/db'
import { userUpdateSchema } from '../../../../lib/validations'
import bcrypt from 'bcryptjs'
import { logActivity } from '../../../utils/logger'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  if (auth.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Hanya admin' })
  const id = Number(event.context.params?.id)
  const body = await readBody(event)
  const parsed = userUpdateSchema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: 'Data tidak valid', data: parsed.error.issues })
  const d = parsed.data
  const db = useDb()

  const sets: string[] = []
  const args: any[] = []
  if (d.nama) { sets.push('nama = ?'); args.push(d.nama) }
  if (d.email !== undefined) {
    const emailNorm = d.email ? d.email.trim().toLowerCase() : null
    if (emailNorm) {
      const dup = await db.execute({ sql: `SELECT id FROM users WHERE LOWER(TRIM(email)) = ? AND id != ? AND deleted_at IS NULL LIMIT 1`, args: [emailNorm, id] })
      if (dup.rows.length > 0) throw createError({ statusCode: 409, statusMessage: 'Email sudah dipakai' })
    }
    sets.push('email = ?'); args.push(emailNorm)
  }
  if (d.role) { sets.push('role = ?'); args.push(d.role) }
  if (d.status) { sets.push('status = ?'); args.push(d.status) }
  if (d.password) {
    const hash = await bcrypt.hash(d.password, 10)
    sets.push('password_hash = ?')
    args.push(hash)
  }
  if (sets.length) {
    await db.execute({ sql: `UPDATE users SET ${sets.join(', ')} WHERE id = ? AND deleted_at IS NULL`, args: [...args, id] })
  }
  await logActivity({ userId: auth.userId, action: 'UPDATE_USER', entity: 'users', entityId: id, ip: getRequestIP(event, { xForwardedFor: true }) })
  return { ok: true }
})
