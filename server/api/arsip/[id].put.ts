import { useDb } from '../../utils/db'
import { readFormWithFile, toIntOrNull } from '../../utils/body'
import { DROPBOX_FOLDERS, uploadToDrive } from '../../utils/dropbox'
import { logActivity } from '../../utils/logger'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  if (!['admin', 'staff'].includes(auth.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Tidak diizinkan mengubah Arsip — hanya Admin & Staff' })
  }
  const id = Number(event.context.params?.id)
  const { fields, file } = await readFormWithFile(event)
  const db = useDb()

  let fileDriveId = fields.file_drive_id || null
  let fileName = fields.file_name || null
  if (file) {
    const up = await uploadToDrive(`${fields.nama_dokumen || 'arsip'}_${file.filename}`, file.type, file.data, DROPBOX_FOLDERS.ARSIP)
    fileDriveId = up.id as string
    fileName = file.filename
  }

  await db.execute({
    sql: `UPDATE arsip SET
      klasifikasi_id = COALESCE(?, klasifikasi_id),
      nama_dokumen = COALESCE(?, nama_dokumen),
      lokasi = COALESCE(?, lokasi),
      tahun = COALESCE(?, tahun),
      file_drive_id = COALESCE(?, file_drive_id),
      file_name = COALESCE(?, file_name)
      WHERE id = ? AND deleted_at IS NULL`,
    args: [
      toIntOrNull(fields.klasifikasi_id),
      fields.nama_dokumen || null,
      fields.lokasi || null,
      toIntOrNull(fields.tahun),
      fileDriveId,
      fileName,
      id
    ]
  })
  await logActivity({
    userId: auth.userId,
    action: 'UPDATE_ARSIP',
    entity: 'arsip',
    entityId: id,
    detail: file ? { file_changed: fileName } : null,
    ip: getRequestIP(event, { xForwardedFor: true })
  })
  return { ok: true }
})
