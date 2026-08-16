import { useDb } from '../../utils/db'
import { readFormWithFile, toIntOrNull } from '../../utils/body'
import { DROPBOX_FOLDERS, uploadToDrive } from '../../utils/dropbox'
import { logActivity } from '../../utils/logger'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  const id = Number(event.context.params?.id)
  const db = useDb()

  const exist = await db.execute({ sql: 'SELECT * FROM surat_masuk WHERE id = ? AND deleted_at IS NULL', args: [id] })
  if (exist.rows.length === 0) throw createError({ statusCode: 404, statusMessage: 'Surat tidak ditemukan' })
  if (auth.role !== 'admin' && auth.userId !== (exist.rows[0] as any).created_by) {
    throw createError({ statusCode: 403, statusMessage: 'Hanya admin atau pembuat surat yang dapat mengubah' })
  }

  const { fields, file } = await readFormWithFile(event)
  let fileDriveId: string | null = (exist.rows[0] as any).file_drive_id
  let fileName: string | null = (exist.rows[0] as any).file_name
  if (file) {
    const up = await uploadToDrive(`${fields.no_surat || id}_${file.filename}`, file.type, file.data, DROPBOX_FOLDERS.SM)
    fileDriveId = up.id as string
    fileName = file.filename
  }

  await db.execute({
    sql: `UPDATE surat_masuk SET
      tgl_surat = ?, tgl_terima = ?, pengirim = ?, perihal = ?, sifat = ?,
      klasifikasi_id = ?, no_agenda = ?, ringkasan = ?, file_drive_id = ?, file_name = ?
      WHERE id = ?`,
    args: [
      fields.tgl_surat, fields.tgl_terima, fields.pengirim, fields.perihal,
      fields.sifat || 'biasa',       toIntOrNull(fields.klasifikasi_id),
      fields.no_agenda || null, fields.ringkasan || null,
      fileDriveId, fileName, id
    ]
  })

  await logActivity({ userId: auth.userId, action: 'UPDATE_SURAT_MASUK', entity: 'surat_masuk', entityId: id, ip: getRequestIP(event, { xForwardedFor: true }) })
  return { ok: true }
})
