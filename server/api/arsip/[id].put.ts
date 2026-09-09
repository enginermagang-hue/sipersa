import { useDb } from '../../utils/db'
import { assertFilesSize, parseKeepIds, readFormWithFiles, toIntOrNull } from '../../utils/body'
import { deleteDriveFile, DROPBOX_FOLDERS, uploadToDrive } from '../../utils/dropbox'
import { logActivity } from '../../utils/logger'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  if (!['admin', 'staff'].includes(auth.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Tidak diizinkan mengubah Arsip — hanya Admin & Staff' })
  }
  const id = Number(event.context.params?.id)
  const { fields, files } = await readFormWithFiles(event)
  const db = useDb()

  assertFilesSize(files)
  // keep_file_ids untuk arsip_files
  if (fields.keep_file_ids !== undefined) {
    const keepIds = parseKeepIds(fields.keep_file_ids)
    const existing = await db.execute({ sql: `SELECT id, file_drive_id FROM arsip_files WHERE arsip_id = ?`, args: [id] })
    const toDelete = (existing.rows as any[]).filter(r => !keepIds.includes(r.id))
    for (const r of toDelete) { try { await deleteDriveFile(r.file_drive_id) } catch {}; await db.execute({ sql: `DELETE FROM arsip_files WHERE id = ?`, args: [r.id] }) }
  }
  const uploaded: { id: string, name: string, type: string, size: number }[] = []
  for (const f of files) {
    const up = await uploadToDrive(`${fields.nama_dokumen || 'arsip'}_${f.filename}`, f.type, f.data, DROPBOX_FOLDERS.ARSIP)
    uploaded.push({ id: up.id as string, name: f.filename, type: f.type, size: f.data.length })
  }
  for (const u of uploaded) {
    await db.execute({ sql: `INSERT INTO arsip_files (arsip_id, file_drive_id, file_name, mime_type, size) VALUES (?, ?, ?, ?, ?)`, args: [id, u.id, u.name, u.type, u.size] })
  }
  const remaining = await db.execute({ sql: `SELECT file_drive_id, file_name FROM arsip_files WHERE arsip_id = ? ORDER BY id ASC LIMIT 1`, args: [id] })
  let fileDriveId = (remaining.rows[0] as any)?.file_drive_id || fields.file_drive_id || null
  let fileName = (remaining.rows[0] as any)?.file_name || fields.file_name || null
  if (!fileDriveId && !fileName) {
    // if no arsip_files yet, keep existing primary
    const cur = await db.execute({ sql: `SELECT file_drive_id, file_name FROM arsip WHERE id = ?`, args: [id] })
    fileDriveId = (cur.rows[0] as any)?.file_drive_id || null
    fileName = (cur.rows[0] as any)?.file_name || null
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
