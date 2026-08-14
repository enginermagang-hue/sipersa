import { useDb } from '../../utils/db'

export default defineEventHandler(async () => {
  const db = useDb()
  const rows = await db.execute({
    sql: 'SELECT * FROM klasifikasi WHERE deleted_at IS NULL ORDER BY kode ASC'
  })
  return rows.rows
})
