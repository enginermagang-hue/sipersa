import { getQuery } from 'h3'
import { useDb } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  if (auth.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Hanya admin' })

  const q = getQuery(event)
  const page = Math.max(1, Number(q.page) || 1)
  const pageSize = Math.min(200, Math.max(1, Number(q.pageSize) || 50))
  const offset = (page - 1) * pageSize

  const where: string[] = ['s.expires_at > datetime(\'now\')']
  const args: (string | number)[] = []

  if (q.user_id) {
    where.push('s.user_id = ?')
    args.push(Number(q.user_id))
  }
  if (q.revoked !== undefined && q.revoked !== '') {
    where.push('s.revoked = ?')
    args.push(q.revoked === '1' || q.revoked === 'true' ? 1 : 0)
  }
  if (q.q) {
    where.push('(s.ip_address LIKE ? OR s.user_agent LIKE ? OR u.nama LIKE ? OR u.username LIKE ?)')
    const like = `%${String(q.q)}%`
    args.push(like, like, like, like)
  }

  const whereSql = `WHERE ${where.join(' AND ')}`

  const db = useDb()
  const totalRes = await db.execute({
    sql: `SELECT COUNT(*) as c FROM sessions s JOIN users u ON u.id = s.user_id ${whereSql}`,
    args
  })
  const total = Number((totalRes.rows[0] as any).c) || 0

  const rows = await db.execute({
    sql: `SELECT s.id, s.user_id, s.expires_at, s.ip_address, s.user_agent, s.last_active, s.revoked, u.nama, u.username, u.role
          FROM sessions s JOIN users u ON u.id = s.user_id
          ${whereSql}
          ORDER BY s.last_active DESC
          LIMIT ? OFFSET ?`,
    args: [...args, pageSize, offset]
  })

  return { rows: rows.rows, total, page, pageSize }
})
