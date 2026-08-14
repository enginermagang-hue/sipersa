import { useDb } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  if (auth.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Hanya admin' })
  const db = useDb()
  const rows = await db.execute({
    sql: `SELECT id, nama, username, email, role, status, last_login, created_at
          FROM users WHERE deleted_at IS NULL ORDER BY nama ASC`
  })
  return rows.rows
})
