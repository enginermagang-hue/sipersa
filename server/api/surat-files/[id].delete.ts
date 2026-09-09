import { useDb } from '../../utils/db'
import { deleteDriveFile } from '../../utils/dropbox'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  const fileId = Number(event.context.params?.id)
  const db = useDb()

  const row = await db.execute({ sql: `SELECT * FROM surat_files WHERE id = ?`, args: [fileId] })
  if (row.rows.length === 0) throw createError({ statusCode: 404, statusMessage: 'File tidak ditemukan' })
  const f = row.rows[0] as any

  // cek ownership surat
  let createdBy: number | null = null
  let suratId: number | null = null
  let type: 'masuk' | 'keluar' = 'masuk'
  if (f.surat_masuk_id) {
    const s = await db.execute({ sql: `SELECT created_by FROM surat_masuk WHERE id = ? AND deleted_at IS NULL`, args: [f.surat_masuk_id] })
    if (s.rows.length === 0) throw createError({ statusCode: 404, statusMessage: 'Surat tidak ditemukan' })
    createdBy = (s.rows[0] as any).created_by
    suratId = f.surat_masuk_id
    type = 'masuk'
  } else if (f.surat_keluar_id) {
    const s = await db.execute({ sql: `SELECT created_by FROM surat_keluar WHERE id = ? AND deleted_at IS NULL`, args: [f.surat_keluar_id] })
    if (s.rows.length === 0) throw createError({ statusCode: 404, statusMessage: 'Surat tidak ditemukan' })
    createdBy = (s.rows[0] as any).created_by
    suratId = f.surat_keluar_id
    type = 'keluar'
  }

  if (auth.role !== 'admin' && auth.userId !== createdBy) {
    throw createError({ statusCode: 403, statusMessage: 'Hanya admin atau pembuat surat yang dapat menghapus file' })
  }

  try { await deleteDriveFile(f.file_drive_id) } catch {}
  await db.execute({ sql: `DELETE FROM surat_files WHERE id = ?`, args: [fileId] })

  // update primary file_drive_id jika yang dihapus adalah primary
  const remaining = await db.execute({
    sql: type === 'masuk'
      ? `SELECT file_drive_id, file_name FROM surat_files WHERE surat_masuk_id = ? ORDER BY id ASC LIMIT 1`
      : `SELECT file_drive_id, file_name FROM surat_files WHERE surat_keluar_id = ? ORDER BY id ASC LIMIT 1`,
    args: [suratId]
  })
  const primary = remaining.rows[0] as any
  if (type === 'masuk') {
    await db.execute({ sql: `UPDATE surat_masuk SET file_drive_id = ?, file_name = ? WHERE id = ?`, args: [primary?.file_drive_id || null, primary?.file_name || null, suratId] })
  } else {
    await db.execute({ sql: `UPDATE surat_keluar SET file_drive_id = ?, file_name = ? WHERE id = ?`, args: [primary?.file_drive_id || null, primary?.file_name || null, suratId] })
  }

  return { ok: true }
})
