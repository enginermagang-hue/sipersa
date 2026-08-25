import { useDb } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  const db = useDb()
  const res = await db.execute({
    sql: 'SELECT ttd_file_drive_id, ttd_file_name FROM users WHERE id = ?',
    args: [auth.userId]
  })
  const r = res.rows[0] as any
  return {
    exists: !!r?.ttd_file_drive_id,
    file_name: r?.ttd_file_name || null,
    file_url: r?.ttd_file_drive_id ? '/api/users/ttd/file' : null
  }
})
