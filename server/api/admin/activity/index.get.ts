import { getQuery } from 'h3'
import { useDb } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  if (auth.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Hanya admin' })
  const query = getQuery(event)
  const limit = Math.min(200, Number(query.limit) || 50)
  const db = useDb()
  const rows = await db.execute({
    sql: `SELECT a.*, u.nama as user_nama FROM activity_log a
          LEFT JOIN users u ON u.id = a.user_id
          ORDER BY a.created_at DESC LIMIT ?`,
    args: [limit]
  })
  return rows.rows
})
