import { useDb } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  if (auth.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Hanya admin' })
  const db = useDb()
  const rows = await db.execute({
    sql: `SELECT s.id, s.user_id, s.expires_at, s.ip_address, s.user_agent, s.last_active, s.revoked, u.nama, u.username, u.role
          FROM sessions s JOIN users u ON u.id = s.user_id
          WHERE s.expires_at > datetime('now')
          ORDER BY s.last_active DESC`
  })
  return rows.rows
})
