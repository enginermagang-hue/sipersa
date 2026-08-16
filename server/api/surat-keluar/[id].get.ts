import { useDb } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const id = Number(event.context.params?.id)
  const db = useDb()
  const res = await db.execute({
    sql: `SELECT sk.*, k.kode as klasifikasi_kode, k.nama as klasifikasi_nama,
                  u.nama as created_by_nama, u.username as created_by_username
          FROM surat_keluar sk
          LEFT JOIN klasifikasi k ON k.id = sk.klasifikasi_id
          LEFT JOIN users u ON u.id = sk.created_by
          WHERE sk.id = ? AND sk.deleted_at IS NULL`,
    args: [id]
  })
  if (res.rows.length === 0) throw createError({ statusCode: 404, statusMessage: 'Surat tidak ditemukan' })

  const ars = await db.execute({
    sql: `SELECT id, nama_dokumen, lokasi, tahun FROM arsip
          WHERE ref_keluar_id = ? AND deleted_at IS NULL LIMIT 1`,
    args: [id]
  })

  return { ...res.rows[0], arsip: ars.rows[0] || null }
})
