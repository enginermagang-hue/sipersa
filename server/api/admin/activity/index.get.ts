import { getQuery } from 'h3'
import { useDb } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  if (auth.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Hanya admin' })

  const q = getQuery(event)
  const page = Math.max(1, Number(q.page) || 1)
  const pageSize = Math.min(200, Math.max(1, Number(q.pageSize) || 50))
  const offset = (page - 1) * pageSize

  const where: string[] = []
  const args: (string | number)[] = []

  if (q.user_id) {
    where.push('a.user_id = ?')
    args.push(Number(q.user_id))
  }
  if (q.action) {
    where.push('a.action = ?')
    args.push(String(q.action))
  }
  if (q.entity) {
    where.push('a.entity = ?')
    args.push(String(q.entity))
  }
  if (q.q) {
    where.push('(a.action LIKE ? OR a.entity LIKE ? OR a.detail LIKE ?)')
    const like = `%${String(q.q)}%`
    args.push(like, like, like)
  }
  if (q.from) {
    where.push('a.created_at >= ?')
    args.push(`${String(q.from)} 00:00:00`)
  }
  if (q.to) {
    where.push('a.created_at <= ?')
    args.push(`${String(q.to)} 23:59:59`)
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const db = useDb()
  const totalRes = await db.execute({
    sql: `SELECT COUNT(*) as c FROM activity_log a ${whereSql}`,
    args
  })
  const total = Number((totalRes.rows[0] as any).c) || 0

  const rows = await db.execute({
    sql: `SELECT a.*, u.nama as user_nama FROM activity_log a
          LEFT JOIN users u ON u.id = a.user_id
          ${whereSql}
          ORDER BY a.created_at DESC, a.id DESC
          LIMIT ? OFFSET ?`,
    args: [...args, pageSize, offset]
  })

  return { rows: rows.rows, total, page, pageSize }
})
