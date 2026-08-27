import { getQuery } from 'h3'
import { useDb } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  if (auth.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Hanya admin' })
  const query = getQuery(event)
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(1000, Math.max(1, Number(query.limit) || 20))
  const offset = (page - 1) * limit

  const db = useDb()
  const q = typeof query.q === 'string' ? query.q.trim() : ''
  const where = q ? `WHERE deleted_at IS NULL AND (nama LIKE ? OR username LIKE ? OR email LIKE ? OR nip LIKE ? OR jabatan LIKE ? OR no_hp LIKE ?)` : `WHERE deleted_at IS NULL`
  const likeArgs = q ? Array(6).fill(`%${q}%`) : []
  const countRes = await db.execute({
    sql: `SELECT COUNT(*) as c FROM users ${where}`,
    args: likeArgs
  })
  const rows = await db.execute({
    sql: `SELECT id, nama, username, email, role, status, nip, no_hp, jabatan, last_login, created_at
          FROM users ${where} ORDER BY nama ASC
          LIMIT ? OFFSET ?`,
    args: [...likeArgs, limit, offset]
  })
  return { total: (countRes.rows[0] as any).c, page, limit, data: rows.rows }
})
