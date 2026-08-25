import { useDb } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  const db = useDb()
  const rows = await db.execute({
    sql: `SELECT id, ip_address, user_agent, created_at, last_active, expires_at, revoked
          FROM sessions
          WHERE user_id = ? AND revoked = 0 AND expires_at > datetime('now')
          ORDER BY last_active DESC`,
    args: [auth.userId]
  })
  return { rows: rows.rows }
})
