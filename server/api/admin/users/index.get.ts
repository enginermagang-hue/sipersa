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
  const countRes = await db.execute({
    sql: `SELECT COUNT(*) as c FROM users WHERE deleted_at IS NULL`
  })
  const rows = await db.execute({
    sql: `SELECT id, nama, username, email, role, status, last_login, created_at
          FROM users WHERE deleted_at IS NULL ORDER BY nama ASC
          LIMIT ? OFFSET ?`,
    args: [limit, offset]
  })
  return { total: (countRes.rows[0] as any).c, page, limit, data: rows.rows }
})
