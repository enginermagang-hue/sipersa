import { useDb } from '../../utils/db'
import { deleteDriveFile } from '../../utils/dropbox'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  if (!['admin', 'staff'].includes(auth.role)) throw createError({ statusCode: 403, statusMessage: 'Tidak diizinkan' })
  const fileId = Number(event.context.params?.id)
  const db = useDb()
  const row = await db.execute({ sql: `SELECT * FROM arsip_files WHERE id = ?`, args: [fileId] })
  if (row.rows.length === 0) throw createError({ statusCode: 404, statusMessage: 'File tidak ditemukan' })
  const f = row.rows[0] as any
  try { await deleteDriveFile(f.file_drive_id) } catch {}
  await db.execute({ sql: `DELETE FROM arsip_files WHERE id = ?`, args: [fileId] })
  const remaining = await db.execute({ sql: `SELECT file_drive_id, file_name FROM arsip_files WHERE arsip_id = ? ORDER BY id ASC LIMIT 1`, args: [f.arsip_id] })
  const primary = remaining.rows[0] as any
  await db.execute({ sql: `UPDATE arsip SET file_drive_id = ?, file_name = ? WHERE id = ?`, args: [primary?.file_drive_id || null, primary?.file_name || null, f.arsip_id] })
  return { ok: true }
})
