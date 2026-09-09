import { useDb } from '../../utils/db'
import { assertFilesSize, parseKeepIds, readFormWithFiles, toIntOrNull } from '../../utils/body'
import { deleteDriveFile, DROPBOX_FOLDERS, uploadToDrive } from '../../utils/dropbox'
import { logActivity } from '../../utils/logger'
import { convertHeicFilesIfNeeded } from '../../utils/heic'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  const id = Number(event.context.params?.id)
  const db = useDb()

  const exist = await db.execute({ sql: 'SELECT * FROM surat_masuk WHERE id = ? AND deleted_at IS NULL', args: [id] })
  if (exist.rows.length === 0) throw createError({ statusCode: 404, statusMessage: 'Surat tidak ditemukan' })
  if (auth.role !== 'admin' && auth.userId !== (exist.rows[0] as any).created_by) {
    throw createError({ statusCode: 403, statusMessage: 'Hanya admin atau pembuat surat yang dapat mengubah' })
  }

  let { fields, files } = await readFormWithFiles(event)
  files = await convertHeicFilesIfNeeded(files as any) as any
  // validasi & normalisasi no_surat jika dikirim (boleh kosong = keep existing)
  const rawNoSurat = fields.no_surat !== undefined ? String(fields.no_surat).trim() : ''
  let finalNoSurat = (exist.rows[0] as any).no_surat as string
  if (rawNoSurat) {
    if (rawNoSurat.toLowerCase() !== String(finalNoSurat).trim().toLowerCase()) {
      const dup = await db.execute({ sql: `SELECT id FROM surat_masuk WHERE LOWER(TRIM(no_surat)) = ? AND id != ? AND deleted_at IS NULL LIMIT 1`, args: [rawNoSurat.toLowerCase(), id] })
      if (dup.rows.length > 0) throw createError({ statusCode: 409, statusMessage: 'No. Surat sudah dipakai' })
      finalNoSurat = rawNoSurat
    }
  }

  assertFilesSize(files)
  // handle keep_file_ids: hapus file yang tidak di-keep (append mode)
  const keepIds = parseKeepIds(fields.keep_file_ids)
  const existingFiles = await db.execute({ sql: `SELECT id, file_drive_id FROM surat_files WHERE surat_masuk_id = ?`, args: [id] })
  const toDelete = (existingFiles.rows as any[]).filter(r => keepIds.length > 0 ? !keepIds.includes(r.id) : false)
  // jika keepIds kosong dan files ada tapi client tidak kirim keep -> anggap append (jangan hapus)
  // hanya hapus jika keepIds explicitly dikirim
  if (fields.keep_file_ids !== undefined && keepIds.length >= 0) {
    // if keepIds was sent (even empty), delete those not kept
    // to avoid accidental mass delete when client didn't send keep, we only delete if field exists
    for (const r of toDelete) {
      try { await deleteDriveFile(r.file_drive_id) } catch {}
      await db.execute({ sql: `DELETE FROM surat_files WHERE id = ?`, args: [r.id] })
    }
  }
  // upload file baru (append)
  const uploaded: { id: string, name: string, type: string, size: number }[] = []
  for (const f of files) {
    const up = await uploadToDrive(`${finalNoSurat || id}_${f.filename}`, f.type, f.data, DROPBOX_FOLDERS.SM)
    uploaded.push({ id: up.id as string, name: f.filename, type: f.type, size: f.data.length })
  }
  for (const u of uploaded) {
    await db.execute({ sql: `INSERT INTO surat_files (surat_masuk_id, file_drive_id, file_name, mime_type, size) VALUES (?, ?, ?, ?, ?)`, args: [id, u.id, u.name, u.type, u.size] })
  }
  // update primary file_drive_id untuk kompatibilitas (file pertama yang tersisa)
  const remaining = await db.execute({ sql: `SELECT file_drive_id, file_name FROM surat_files WHERE surat_masuk_id = ? ORDER BY id ASC LIMIT 1`, args: [id] })
  let fileDriveId: string | null = (remaining.rows[0] as any)?.file_drive_id ?? null
  let fileName: string | null = (remaining.rows[0] as any)?.file_name ?? null

  await db.execute({
    sql: `UPDATE surat_masuk SET
      tgl_surat = ?, tgl_terima = ?, pengirim = ?, perihal = ?, sifat = ?,
      klasifikasi_id = ?, no_agenda = ?, ringkasan = ?, no_surat = ?, file_drive_id = ?, file_name = ?
      WHERE id = ?`,
    args: [
      fields.tgl_surat, fields.tgl_terima, fields.pengirim, fields.perihal,
      fields.sifat || 'biasa',       toIntOrNull(fields.klasifikasi_id),
      fields.no_agenda || null, fields.ringkasan || null, finalNoSurat,
      fileDriveId, fileName, id
    ]
  })

  await logActivity({ userId: auth.userId, action: 'UPDATE_SURAT_MASUK', entity: 'surat_masuk', entityId: id, ip: getRequestIP(event, { xForwardedFor: true }) })
  return { ok: true }
})
