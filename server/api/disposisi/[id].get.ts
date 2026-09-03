import { useDb } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  const id = Number(event.context.params?.id)
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID tidak valid' })
  const db = useDb()
  const row = await db.execute({
    sql: `SELECT d.*, sm.no_surat, sm.perihal, sm.pengirim, sm.tgl_surat, sm.tgl_terima, sm.sifat as surat_sifat, sm.file_drive_id, sm.file_name,
                 u.nama as dari_nama, u2.nama as kepada_nama, k.kode as klasifikasi_kode, k.nama as klasifikasi_nama
          FROM disposisi d
          JOIN surat_masuk sm ON sm.id = d.surat_masuk_id
          JOIN users u ON u.id = d.dari_user_id
          JOIN users u2 ON u2.id = d.kepada_user_id
          LEFT JOIN klasifikasi k ON k.id = sm.klasifikasi_id
          WHERE d.id = ? AND d.deleted_at IS NULL`,
    args: [id]
  })
  if (row.rows.length === 0) throw createError({ statusCode: 404, statusMessage: 'Disposisi tidak ditemukan' })
  const d = row.rows[0] as any
  const allowed = d.kepada_user_id === auth.userId || d.dari_user_id === auth.userId || ['pimpinan', 'admin'].includes(auth.role)
  if (!allowed) throw createError({ statusCode: 403, statusMessage: 'Tidak diizinkan mengakses disposisi ini' })
  // fetch children (forwarded)
  const children = await db.execute({
    sql: `SELECT d2.*, u.nama as kepada_nama, u2.nama as dari_nama
          FROM disposisi d2
          JOIN users u ON u.id = d2.kepada_user_id
          JOIN users u2 ON u2.id = d2.dari_user_id
          WHERE d2.parent_id = ? AND d2.deleted_at IS NULL ORDER BY d2.created_at ASC`,
    args: [id]
  })
  // fetch siblings / all for same surat for context
  const siblings = await db.execute({
    sql: `SELECT id, parent_id, kepada_user_id, status FROM disposisi WHERE surat_masuk_id = ? AND deleted_at IS NULL ORDER BY created_at ASC`,
    args: [d.surat_masuk_id]
  })
  return { disposisi: d, surat: { id: d.surat_masuk_id, no_surat: d.no_surat, perihal: d.perihal, pengirim: d.pengirim, tgl_surat: d.tgl_surat, tgl_terima: d.tgl_terima, surat_sifat: d.surat_sifat, file_drive_id: d.file_drive_id, file_name: d.file_name, klasifikasi_kode: d.klasifikasi_kode, klasifikasi_nama: d.klasifikasi_nama }, children: children.rows, allForSurat: siblings.rows }
})
