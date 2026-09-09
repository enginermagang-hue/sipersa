import { useDb } from '../../../utils/db'
import { getDriveFile, DROPBOX_FOLDERS, uploadToDrive, deleteDriveFile } from '../../../utils/dropbox'
import { scanImageBuffer, isImageLike, getScanUrl } from '../../../utils/docscan'
import { logActivity } from '../../../utils/logger'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  const id = Number(event.context.params?.id)
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID tidak valid' })
  if (!getScanUrl()) throw createError({ statusCode: 503, statusMessage: 'Layanan scan belum dikonfigurasi' })
  const db = useDb()
  const suratRes = await db.execute({ sql: `SELECT id, no_surat, file_drive_id, file_name, created_by FROM surat_keluar WHERE id=? AND deleted_at IS NULL`, args: [id] })
  if (!suratRes.rows.length) throw createError({ statusCode: 404, statusMessage: 'Surat tidak ditemukan' })
  const surat = suratRes.rows[0] as any
  if (auth.role !== 'admin' && auth.userId !== surat.created_by) throw createError({ statusCode: 403, statusMessage: 'Hanya admin atau pembuat surat' })

  const filesRes = await db.execute({ sql: `SELECT id, file_drive_id, file_name, mime_type FROM surat_files WHERE surat_keluar_id=? ORDER BY id ASC`, args: [id] })
  let rows: any[] = filesRes.rows as any[]
  if (rows.length === 0 && surat.file_drive_id) rows = [{ id: 0, file_drive_id: surat.file_drive_id, file_name: surat.file_name, mime_type: null }]
  if (rows.length === 0) throw createError({ statusCode: 422, statusMessage: 'Tidak ada file untuk diperbaiki' })

  const repaired: any[] = []; const skipped: any[] = []; const failed: any[] = []
  for (const r of rows) {
    const name: string = r.file_name || 'file'
    const mime: string = r.mime_type || ''
    if (!isImageLike(name, mime)) { skipped.push({ file_name: name, reason: 'Bukan gambar (dilewati)' }); continue }
    try {
      const dl = await getDriveFile(r.file_drive_id, name)
      const buf = await scanImageBuffer(dl.data as Buffer, name, dl.headers['content-type'] || mime || 'image/jpeg')
      const newName = name.replace(/\.[^.]+$/, '.jpg')
      const up = await uploadToDrive(`${surat.no_surat || id}_${newName}`, 'image/jpeg', buf, DROPBOX_FOLDERS.SK)
      const newId = up.id as string
      if (r.id) await db.execute({ sql: `UPDATE surat_files SET file_drive_id=?, file_name=?, mime_type='image/jpeg', size=? WHERE id=?`, args: [newId, newName, buf.length, r.id] })
      if (surat.file_drive_id === r.file_drive_id || !surat.file_drive_id) {
        await db.execute({ sql: `UPDATE surat_keluar SET file_drive_id=?, file_name=? WHERE id=?`, args: [newId, newName, id] })
      } else if (rows.length === 1 && r.id === 0) {
        await db.execute({ sql: `UPDATE surat_keluar SET file_drive_id=?, file_name=? WHERE id=?`, args: [newId, newName, id] })
      }
      try { await deleteDriveFile(r.file_drive_id) } catch {}
      repaired.push({ file_name: name, new_file_name: newName })
    } catch (e: any) { failed.push({ file_name: name, reason: e?.statusMessage || e?.message || 'Gagal' }) }
  }
  await logActivity({ userId: auth.userId, action: 'REPAIR_SURAT_KELUAR_IMAGE', entity: 'surat_keluar', entityId: id, detail: { repaired: repaired.length, skipped: skipped.length, failed: failed.length }, ip: getRequestIP(event, { xForwardedFor: true }) })
  return { repaired, skipped, failed }
})
