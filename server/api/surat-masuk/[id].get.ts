import { useDb } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const id = Number(event.context.params?.id)
  const db = useDb()
  const res = await db.execute({
    sql: `SELECT sm.*, k.kode as klasifikasi_kode, k.nama as klasifikasi_nama
          FROM surat_masuk sm
          LEFT JOIN klasifikasi k ON k.id = sm.klasifikasi_id
          WHERE sm.id = ? AND sm.deleted_at IS NULL`,
    args: [id]
  })
  if (res.rows.length === 0) {
    throw createError({ statusCode: 404, statusMessage: 'Surat tidak ditemukan' })
  }
  const surat = res.rows[0]

  const disp = await db.execute({
    sql: `SELECT d.*, u.nama as kepada_nama, u2.nama as dari_nama
          FROM disposisi d
          JOIN users u ON u.id = d.kepada_user_id
          JOIN users u2 ON u2.id = d.dari_user_id
          WHERE d.surat_masuk_id = ? AND d.deleted_at IS NULL
          ORDER BY d.created_at ASC`,
    args: [id]
  })

  return { surat, disposisi: disp.rows }
})
