import { useDb } from '../../utils/db'

export default defineEventHandler(async () => {
  const db = useDb()
  const rows = await db.execute({
    sql: `SELECT id, nama, username, role, status, nip FROM users WHERE status = 'active' AND deleted_at IS NULL ORDER BY nama ASC`
  })
  return rows.rows
})
