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

  const approvals = await db.execute({
    sql: `SELECT a.id, a.status, a.catatan, a.reviewed_at,
                 u.nama AS reviewer_nama, u.jabatan AS reviewer_jabatan
          FROM surat_keluar_approval a
          LEFT JOIN users u ON u.id = a.reviewed_by
          WHERE a.surat_keluar_id = ?
          ORDER BY a.reviewed_at DESC`,
    args: [id]
  })

  return { ...res.rows[0], arsip: ars.rows[0] || null, approvals: approvals.rows }
})
