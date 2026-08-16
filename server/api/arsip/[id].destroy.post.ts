import { useDb } from '../../utils/db'
import { logActivity } from '../../utils/logger'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  const id = Number(event.context.params?.id)
  const body = await readBody(event)
  const db = useDb()

  const res = await db.execute({
    sql: `SELECT a.id,
            CASE WHEN COALESCE(k.retensi_tahun, 0) = 0 THEN NULL
                 ELSE CAST(strftime('%Y', a.tgl_arsip) AS INTEGER) + k.retensi_tahun END as tahun_musnah
          FROM arsip a
          LEFT JOIN klasifikasi k ON k.id = a.klasifikasi_id
          WHERE a.id = ? AND a.deleted_at IS NULL`,
    args: [id]
  })
  if (res.rows.length === 0) throw createError({ statusCode: 404, statusMessage: 'Arsip tidak ditemukan' })
  const row = res.rows[0] as any
  if (row.tahun_musnah != null && row.tahun_musnah >= new Date().getFullYear()) {
    throw createError({ statusCode: 400, statusMessage: 'Arsip belum memasuki masa retensi' })
  }

  await db.execute({
    sql: `UPDATE arsip SET deleted_at = datetime('now'), alasan_musnah = ? WHERE id = ?`,
    args: [body.alasan || null, id]
  })
  await logActivity({
    userId: auth.userId,
    action: 'DESTROY_ARSIP',
    entity: 'arsip',
    entityId: id,
    detail: body.alasan ? { alasan: body.alasan } : null,
    ip: getRequestIP(event, { xForwardedFor: true })
  })
  return { ok: true }
})
