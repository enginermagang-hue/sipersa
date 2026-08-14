import { useDb } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const id = Number(event.context.params?.id)
  const db = useDb()
  const res = await db.execute({
    sql: `SELECT sk.*, k.kode as klasifikasi_kode, k.nama as klasifikasi_nama
          FROM surat_keluar sk
          LEFT JOIN klasifikasi k ON k.id = sk.klasifikasi_id
          WHERE sk.id = ? AND sk.deleted_at IS NULL`,
    args: [id]
  })
  if (res.rows.length === 0) throw createError({ statusCode: 404, statusMessage: 'Surat tidak ditemukan' })
  return res.rows[0]
})
