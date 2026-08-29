import { useDb } from '../../utils/db'
import { logActivity } from '../../utils/logger'

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  baru: ['diproses', 'selesai'],
  diproses: ['selesai', 'baru'],
  selesai: []
}

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  const id = Number(event.context.params?.id)
  const body = await readBody(event)
  const status = body.status as string
  if (!['baru', 'diproses', 'selesai'].includes(status)) {
    throw createError({ statusCode: 422, statusMessage: 'Status tidak valid' })
  }

  const db = useDb()
  const row = await db.execute({
    sql: `SELECT d.*, sm.no_surat, u.nama as kepada_nama
          FROM disposisi d
          JOIN surat_masuk sm ON sm.id = d.surat_masuk_id
          JOIN users u ON u.id = d.kepada_user_id
          WHERE d.id = ? AND d.kepada_user_id = ? AND d.deleted_at IS NULL`,
    args: [id, auth.userId]
  })
  if (row.rows.length === 0) {
    throw createError({ statusCode: 404, statusMessage: 'Disposisi tidak ditemukan' })
  }
  const cur = row.rows[0] as any
  if (!(ALLOWED_TRANSITIONS[cur.status] || []).includes(status)) {
    throw createError({ statusCode: 422, statusMessage: `Transisi status tidak valid dari '${cur.status}'` })
  }

  await db.execute({
    sql: `UPDATE disposisi SET
            status = ?,
            diproses_at = CASE WHEN ? = 'diproses' THEN COALESCE(diproses_at, datetime('now')) ELSE NULL END,
            selesai_at = CASE WHEN ? = 'selesai' THEN datetime('now') ELSE NULL END,
            catatan = COALESCE(?, catatan)
          WHERE id = ? AND kepada_user_id = ? AND deleted_at IS NULL`,
    args: [status, status, status, body.catatan ?? null, id, auth.userId]
  })

  if (cur.dari_user_id !== auth.userId) {
    await db.execute({
      sql: `INSERT INTO notifications (user_id, title, message, entity, entity_id)
            VALUES (?, ?, ?, 'disposisi', ?)`,
      args: [
        cur.dari_user_id,
        'Status Disposisi Diperbarui',
        `Surat ${cur.no_surat}: status menjadi '${status}' oleh ${cur.kepada_nama}`,
        id
      ]
    })
  }

  if (status === 'selesai') {
    const sisa = await db.execute({ sql: `SELECT COUNT(*) as c FROM disposisi WHERE surat_masuk_id=? AND status!='selesai' AND deleted_at IS NULL`, args: [cur.surat_masuk_id] })
    if ((sisa.rows[0] as any).c === 0) {
      await db.execute({ sql: `UPDATE surat_masuk SET status='selesai' WHERE id=?`, args: [cur.surat_masuk_id] })
    }
  }

  await logActivity({ userId: auth.userId, action: 'UPDATE_DISPOSISI', entity: 'disposisi', entityId: id, detail: { status, dari_status: cur.status }, ip: getRequestIP(event, { xForwardedFor: true }) })
  return { ok: true }
})
