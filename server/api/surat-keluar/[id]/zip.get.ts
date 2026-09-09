import { useDb } from '../../../utils/db'
import { getDriveFile } from '../../../utils/dropbox'
import JSZip from 'jszip'

export default defineEventHandler(async (event) => {
  const id = Number(event.context.params?.id)
  const db = useDb()
  const surat = await db.execute({ sql: `SELECT no_surat FROM surat_keluar WHERE id = ? AND deleted_at IS NULL`, args: [id] })
  if (surat.rows.length === 0) throw createError({ statusCode: 404, statusMessage: 'Surat tidak ditemukan' })
  const files = await db.execute({ sql: `SELECT file_drive_id, file_name FROM surat_files WHERE surat_keluar_id = ? ORDER BY id ASC`, args: [id] })
  let rows = files.rows as any[]
  if (!rows.length) {
    const legacy = await db.execute({ sql: `SELECT file_drive_id, file_name FROM surat_keluar WHERE id = ? AND file_drive_id IS NOT NULL`, args: [id] })
    rows = legacy.rows as any[]
  }
  if (!rows.length) throw createError({ statusCode: 404, statusMessage: 'Tidak ada file' })

  const zip = new JSZip()
  for (const r of rows) {
    try {
      const res = await getDriveFile(r.file_drive_id, r.file_name)
      zip.file(r.file_name || `file-${r.file_drive_id}`, res.data as any)
    } catch (e: any) {
      zip.file(`GAGAL-${r.file_name || r.file_drive_id}.txt`, `Gagal ambil file ${r.file_name}: ${e?.message || e}`)
    }
  }
  const buf = await zip.generateAsync({ type: 'nodebuffer' })
  const zipName = `${(surat.rows[0] as any).no_surat.replace(/[\/\\]/g, '-')}.zip`
  setHeader(event, 'Content-Type', 'application/zip')
  setHeader(event, 'Content-Disposition', `attachment; filename="${zipName}"`)
  setHeader(event, 'Content-Length', String(buf.length))
  return buf
})
