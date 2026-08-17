import { useDb } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  const db = useDb()
  const rows = await db.execute({
    sql: `SELECT d.*, sm.no_surat, sm.perihal, u.nama as dari_nama, u2.nama as kepada_nama
          FROM disposisi d
          JOIN surat_masuk sm ON sm.id = d.surat_masuk_id
          JOIN users u ON u.id = d.dari_user_id
          LEFT JOIN users u2 ON u2.id = d.kepada_user_id
          WHERE d.kepada_user_id = ? AND d.deleted_at IS NULL
          ORDER BY d.created_at DESC`,
    args: [auth.userId]
  })
  return rows.rows
})
