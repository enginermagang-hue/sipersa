import { useDb } from '../../../utils/db'
import { getDriveFile, DROPBOX_FOLDERS, uploadToDrive, deleteDriveFile } from '../../../utils/dropbox'
import { scanImageBuffer, isImageLike, getScanUrl } from '../../../utils/docscan'
import { logActivity } from '../../../utils/logger'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  if (!['admin', 'staff'].includes(auth.role)) throw createError({ statusCode: 403, statusMessage: 'Hanya Admin & Staff' })
  const id = Number(event.context.params?.id)
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID tidak valid' })
  if (!getScanUrl()) throw createError({ statusCode: 503, statusMessage: 'Layanan scan belum dikonfigurasi (NUXT_DOCSCAN_URL kosong)' })

  const db = useDb()
  const arsipRes = await db.execute({ sql: `SELECT id, file_drive_id, file_name FROM arsip WHERE id=? AND deleted_at IS NULL`, args: [id] })
  if (!arsipRes.rows.length) throw createError({ statusCode: 404, statusMessage: 'Arsip tidak ditemukan' })

  const filesRes = await db.execute({ sql: `SELECT id, file_drive_id, file_name, mime_type FROM arsip_files WHERE arsip_id=? ORDER BY id ASC`, args: [id] })
  let rows: any[] = filesRes.rows as any[]
  // fallback legacy single-file arsip without arsip_files rows
  if (rows.length === 0 && (arsipRes.rows[0] as any).file_drive_id) {
    rows = [{ id: 0, file_drive_id: (arsipRes.rows[0] as any).file_drive_id, file_name: (arsipRes.rows[0] as any).file_name, mime_type: null }]
  }
  if (rows.length === 0) throw createError({ statusCode: 422, statusMessage: 'Tidak ada file untuk diperbaiki' })

  const repaired: any[] = []
  const skipped: any[] = []
  const failed: any[] = []

  for (const r of rows) {
    const name: string = r.file_name || 'file'
    const mime: string = r.mime_type || ''
    if (!isImageLike(name, mime)) { skipped.push({ file_name: name, reason: 'Bukan gambar (dilewati)' }); continue }
    try {
      const dl = await getDriveFile(r.file_drive_id, name)
      const buf = await scanImageBuffer(dl.data as Buffer, name, dl.headers['content-type'] || mime || 'image/jpeg')
      const newName = name.replace(/\.[^.]+$/, '.jpg')
      const up = await uploadToDrive(`arsip${id}_${newName}`, 'image/jpeg', buf, DROPBOX_FOLDERS.ARSIP)
      const newId = up.id as string
      if (r.id) {
        await db.execute({ sql: `UPDATE arsip_files SET file_drive_id=?, file_name=?, mime_type='image/jpeg', size=? WHERE id=?`, args: [newId, newName, buf.length, r.id] })
      }
      // sync primary arsip row if it pointed to this file or empty
      const primary = arsipRes.rows[0] as any
      if (primary.file_drive_id === r.file_drive_id || !primary.file_drive_id) {
        await db.execute({ sql: `UPDATE arsip SET file_drive_id=?, file_name=? WHERE id=?`, args: [newId, newName, id] })
      } else if (rows.length === 1 && r.id === 0) {
        await db.execute({ sql: `UPDATE arsip SET file_drive_id=?, file_name=? WHERE id=?`, args: [newId, newName, id] })
      }
      try { await deleteDriveFile(r.file_drive_id) } catch {}
      repaired.push({ file_name: name, new_file_name: newName })
    } catch (e: any) {
      failed.push({ file_name: name, reason: e?.statusMessage || e?.message || 'Gagal' })
    }
  }

  await logActivity({ userId: auth.userId, action: 'REPAIR_ARSIP_IMAGE', entity: 'arsip', entityId: id, detail: { repaired: repaired.length, skipped: skipped.length, failed: failed.length }, ip: getRequestIP(event, { xForwardedFor: true }) })

  return { repaired, skipped, failed }
})
