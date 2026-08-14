import { useDb } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  const db = useDb()
  const rows = await db.execute({
    sql: `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC, "read" ASC LIMIT 50`,
    args: [auth.userId]
  })
  return rows.rows
})
