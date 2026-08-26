import { useDb } from '../../utils/db'
import { profileUpdateSchema } from '../../../lib/validations'
import bcrypt from 'bcryptjs'
import { logActivity } from '../../utils/logger'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  const body = await readBody(event)
  const parsed = profileUpdateSchema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: 'Data tidak valid', data: parsed.error.issues })
  const d = parsed.data
  const db = useDb()

  if (d.username) {
    const existing = await db.execute({ sql: 'SELECT id FROM users WHERE username = ? AND id != ? AND deleted_at IS NULL', args: [d.username, auth.userId] })
    if (existing.rows.length) throw createError({ statusCode: 422, statusMessage: 'Username sudah digunakan' })
  }

  const sets: string[] = []
  const args: any[] = []
  if (d.nama) { sets.push('nama = ?'); args.push(d.nama) }
  if (d.username) { sets.push('username = ?'); args.push(d.username) }
  if (d.email !== undefined) {
    const emailNorm = d.email ? d.email.trim().toLowerCase() : null
    if (emailNorm) {
      const dup = await db.execute({ sql: `SELECT id FROM users WHERE LOWER(TRIM(email)) = ? AND id != ? AND deleted_at IS NULL LIMIT 1`, args: [emailNorm, auth.userId] })
      if (dup.rows.length > 0) throw createError({ statusCode: 422, statusMessage: 'Email sudah dipakai' })
    }
    sets.push('email = ?'); args.push(emailNorm)
  }
  if (d.no_hp !== undefined) { sets.push('no_hp = ?'); args.push(d.no_hp || null) }
  if (d.unit_kerja !== undefined) { sets.push('unit_kerja = ?'); args.push(d.unit_kerja || null) }
  if (d.jabatan !== undefined) { sets.push('jabatan = ?'); args.push(d.jabatan || null) }
  if (d.tanggal_bergabung !== undefined) { sets.push('tanggal_bergabung = ?'); args.push(d.tanggal_bergabung || null) }
  if (d.email_notifikasi !== undefined) { sets.push('email_notifikasi = ?'); args.push(d.email_notifikasi ? 1 : 0) }
  if (d.password) {
    const hash = await bcrypt.hash(d.password, 10)
    sets.push('password_hash = ?'); args.push(hash)
  }
  if (sets.length) {
    await db.execute({ sql: `UPDATE users SET ${sets.join(', ')} WHERE id = ? AND deleted_at IS NULL`, args: [...args, auth.userId] })
  }

  const me = await db.execute({ sql: 'SELECT id, nama, username, email, role, status, no_hp, unit_kerja, jabatan, tanggal_bergabung, email_notifikasi FROM users WHERE id = ? AND deleted_at IS NULL', args: [auth.userId] })
  await logActivity({ userId: auth.userId, action: 'UPDATE_PROFILE', entity: 'users', entityId: auth.userId, ip: getRequestIP(event, { xForwardedFor: true }) })

  return { user: me.rows[0] }
})
