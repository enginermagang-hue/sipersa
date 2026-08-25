import { useDb } from '../../../utils/db'
import { getDriveFile } from '../../../utils/dropbox'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  const db = useDb()
  const res = await db.execute({
    sql: 'SELECT ttd_file_drive_id, ttd_file_name FROM users WHERE id = ?',
    args: [auth.userId]
  })
  const r = res.rows[0] as any
  if (!r?.ttd_file_drive_id) throw createError({ statusCode: 404, statusMessage: 'Tanda tangan belum diunggah' })

  const driveRes = await getDriveFile(r.ttd_file_drive_id, r.ttd_file_name)
  setHeader(event, 'Content-Type', (driveRes.headers['content-type'] as string) || 'image/png')
  setHeader(event, 'Cache-Control', 'no-store')
  return driveRes.data
})
