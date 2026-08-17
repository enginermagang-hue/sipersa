import { useDb } from '../../utils/db'
import { readFormWithFile, toIntOrNull } from '../../utils/body'
import { DROPBOX_FOLDERS, uploadToDrive } from '../../utils/dropbox'
import { logActivity } from '../../utils/logger'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  const id = Number(event.context.params?.id)
  const db = useDb()
  const exist = await db.execute({ sql: 'SELECT * FROM surat_keluar WHERE id = ? AND deleted_at IS NULL', args: [id] })
  if (exist.rows.length === 0) throw createError({ statusCode: 404, statusMessage: 'Surat tidak ditemukan' })

  const { fields, file } = await readFormWithFile(event)
  let fileDriveId: string | null = (exist.rows[0] as any).file_drive_id
  let fileName: string | null = (exist.rows[0] as any).file_name
  if (file) {
    const up = await uploadToDrive(`${(exist.rows[0] as any).no_surat}_${file.filename}`, file.type, file.data, DROPBOX_FOLDERS.SK)
    fileDriveId = up.id as string
    fileName = file.filename
  }

  await db.execute({
    sql: `UPDATE surat_keluar SET
      tgl_surat = ?, tujuan = ?, perihal = ?, sifat = ?, klasifikasi_id = ?, status = ?, penandatangan = ?, file_drive_id = ?, file_name = ?
      WHERE id = ?`,
    args: [
      fields.tgl_surat, fields.tujuan, fields.perihal, fields.sifat || 'biasa',
      toIntOrNull(fields.klasifikasi_id), fields.status || 'draft', fields.penandatangan || '',
      fileDriveId, fileName, id
    ]
  })
  await logActivity({ userId: auth.userId, action: 'UPDATE_SURAT_KELUAR', entity: 'surat_keluar', entityId: id, ip: getRequestIP(event, { xForwardedFor: true }) })
  return { ok: true }
})
