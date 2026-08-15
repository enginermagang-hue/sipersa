import { useDb } from '../../utils/db'
import { getDriveFile } from '../../utils/dropbox'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id
  const db = useDb()
  // cari file_drive_id dari surat masuk/keluar berdasar id file
  const res = await db.execute({
    sql: `SELECT file_drive_id, file_name FROM surat_masuk WHERE file_drive_id = ? AND deleted_at IS NULL
          UNION ALL
          SELECT file_drive_id, file_name FROM surat_keluar WHERE file_drive_id = ? AND deleted_at IS NULL
          LIMIT 1`,
    args: [id as string, id as string]
  })
  if (res.rows.length === 0) throw createError({ statusCode: 404, statusMessage: 'File tidak ditemukan' })
  const meta = res.rows[0] as any

  const inline = getQuery(event).inline === '1'
  const driveRes = await getDriveFile(id as string, meta.file_name)

  setHeader(event, 'Content-Type', (driveRes.headers['content-type'] as string) || 'application/octet-stream')
  setHeader(event, 'Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="${meta.file_name || 'file'}"`)
  if (driveRes.headers['content-length']) {
    setHeader(event, 'Content-Length', driveRes.headers['content-length'] as string)
  }
  return driveRes.data
})
