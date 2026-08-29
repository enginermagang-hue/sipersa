import { useDb } from '../../../utils/db'
import { logActivity } from '../../../utils/logger'
import { notifyPimpinanSuratKeluar } from '../../../utils/notify'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  const id = Number(event.context.params?.id)
  const db = useDb()

  const res = await db.execute({ sql: 'SELECT * FROM surat_keluar WHERE id = ? AND deleted_at IS NULL', args: [id] })
  if (res.rows.length === 0) throw createError({ statusCode: 404, statusMessage: 'Surat tidak ditemukan' })
  const surat = res.rows[0] as any

  if (!['draft', 'ditolak'].includes(surat.status)) {
    throw createError({ statusCode: 400, statusMessage: 'Hanya surat berstatus draft atau ditolak yang dapat disubmit' })
  }
  if (auth.role !== 'admin' && surat.created_by !== auth.userId) {
    throw createError({ statusCode: 403, statusMessage: 'Hanya pembuat surat yang dapat submit' })
  }
  if (surat.status === 'draft' && !surat.html_content && !surat.file_drive_id) {
    throw createError({ statusCode: 400, statusMessage: 'Surat belum memiliki isi (HTML atau file). Lengkapi terlebih dahulu.' })
  }

  await db.execute({
    sql: `UPDATE surat_keluar SET status = 'menunggu_persetujuan', submitted_at = datetime('now'), submitted_by = ?, catatan_tolak = NULL WHERE id = ?`,
    args: [auth.userId, id]
  })
  await notifyPimpinanSuratKeluar(db, { id, no_surat: surat.no_surat, tujuan: surat.tujuan, perihal: surat.perihal })
  await logActivity({ userId: auth.userId, action: 'SUBMIT_SURAT_KELUAR', entity: 'surat_keluar', entityId: id, detail: { no_surat: surat.no_surat }, ip: getRequestIP(event, { xForwardedFor: true }) })
  return { ok: true }
})
