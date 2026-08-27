import { useDb } from '../../utils/db'
import { deleteDriveFile } from '../../utils/dropbox'
import { logActivity } from '../../utils/logger'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  const db = useDb()
  const res = await db.execute({
    sql: 'SELECT ttd_file_drive_id FROM users WHERE id = ?',
    args: [auth.userId]
  })
  const r = res.rows[0] as any

  if (r?.ttd_file_drive_id) {
    await deleteDriveFile(r.ttd_file_drive_id).catch(() => {})
  }

  await db.execute({
    sql: 'UPDATE users SET ttd_file_drive_id = NULL, ttd_file_name = NULL WHERE id = ?',
    args: [auth.userId]
  })
  await logActivity({ userId: auth.userId, action: 'DELETE_TTD', entity: 'users', entityId: auth.userId, ip: getRequestIP(event, { xForwardedFor: true }) })

  return { ok: true }
})
