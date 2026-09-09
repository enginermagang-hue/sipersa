import { useDb } from '../../utils/db'
import { assertFilesSize, parseKeepIds, readFormWithFiles } from '../../utils/body'
import { deleteDriveFile, DROPBOX_FOLDERS, uploadToDrive } from '../../utils/dropbox'
import { logActivity } from '../../utils/logger'
import { notifyPimpinanSuratKeluar } from '../../utils/notify'
import { convertHeicFilesIfNeeded } from '../../utils/heic'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  const id = Number(event.context.params?.id)
  const db = useDb()
  const exist = await db.execute({ sql: 'SELECT * FROM surat_keluar WHERE id = ? AND deleted_at IS NULL', args: [id] })
  if (exist.rows.length === 0) throw createError({ statusCode: 404, statusMessage: 'Surat tidak ditemukan' })

  const surat = exist.rows[0] as any
  if (surat.status === 'draft' && auth.role !== 'admin' && surat.created_by !== auth.userId) {
    throw createError({ statusCode: 403, statusMessage: 'Hanya pembuat atau admin yang dapat mengedit draft' })
  }

  let { fields, files } = await readFormWithFiles(event)
  files = await convertHeicFilesIfNeeded(files as any) as any
  assertFilesSize(files)
  // handle keep_file_ids untuk multi-file
  const keepIds = parseKeepIds(fields.keep_file_ids)
  if (fields.keep_file_ids !== undefined) {
    const existingFiles = await db.execute({ sql: `SELECT id, file_drive_id FROM surat_files WHERE surat_keluar_id = ?`, args: [id] })
    const toDelete = (existingFiles.rows as any[]).filter(r => !keepIds.includes(r.id))
    for (const r of toDelete) {
      try { await deleteDriveFile(r.file_drive_id) } catch {}
      await db.execute({ sql: `DELETE FROM surat_files WHERE id = ?`, args: [r.id] })
    }
  }
  const uploaded: { id: string, name: string, type: string, size: number }[] = []
  for (const f of files) {
    const up = await uploadToDrive(`${(exist.rows[0] as any).no_surat}_${f.filename}`, f.type, f.data, DROPBOX_FOLDERS.SK)
    uploaded.push({ id: up.id as string, name: f.filename, type: f.type, size: f.data.length })
  }
  for (const u of uploaded) {
    await db.execute({ sql: `INSERT INTO surat_files (surat_keluar_id, file_drive_id, file_name, mime_type, size) VALUES (?, ?, ?, ?, ?)`, args: [id, u.id, u.name, u.type, u.size] })
  }
  const remaining = await db.execute({ sql: `SELECT file_drive_id, file_name FROM surat_files WHERE surat_keluar_id = ? ORDER BY id ASC LIMIT 1`, args: [id] })
  let fileDriveId: string | null = (remaining.rows[0] as any)?.file_drive_id ?? null
  let fileName: string | null = (remaining.rows[0] as any)?.file_name ?? null
  // if no files in surat_files yet but legacy exists, keep legacy until migrated
  if (!fileDriveId) {
    fileDriveId = (exist.rows[0] as any).file_drive_id
    fileName = (exist.rows[0] as any).file_name
  }

  const kode = (fields.klasifikasi_kode ?? fields.klasifikasi_id ?? (exist.rows[0] as any).klasifikasi_kode ?? '').toString().trim()
  if (!kode) throw createError({ statusCode: 422, statusMessage: 'Kode klasifikasi wajib diisi' })

  await db.execute({
    sql: `UPDATE surat_keluar SET tgl_surat = ?, tujuan = ?, perihal = ?, sifat = ?, klasifikasi_kode = ?, status = ?, penandatangan = ?, penandatangan_id = ?, html_content = ?, render_config = ?, file_drive_id = ?, file_name = ? WHERE id = ?`,
    args: [ fields.tgl_surat, fields.tujuan, fields.perihal, fields.sifat || 'biasa', kode, fields.status || 'draft', fields.penandatangan || '', fields.penandatangan_id ? Number(fields.penandatangan_id) : null, fields.html_content || null, fields.render_config || null, fileDriveId, fileName, id ]
  })
  if (surat.status !== 'menunggu_persetujuan' && (fields.status === 'menunggu_persetujuan')) {
    await notifyPimpinanSuratKeluar(db, { id, no_surat: (surat as any).no_surat, tujuan: fields.tujuan as string, perihal: fields.perihal as string })
  }
  await logActivity({ userId: auth.userId, action: 'UPDATE_SURAT_KELUAR', entity: 'surat_keluar', entityId: id, ip: getRequestIP(event, { xForwardedFor: true }) })
  return { ok: true }
})
