import { getQuery } from 'h3'
import { useDb } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const q = ((query.q as string) || '').trim()
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 20))
  const db = useDb()
  const sql = q
    ? `SELECT DISTINCT pengirim FROM surat_masuk WHERE deleted_at IS NULL AND pengirim LIKE ? COLLATE NOCASE ORDER BY pengirim ASC LIMIT ?`
    : `SELECT DISTINCT pengirim FROM surat_masuk WHERE deleted_at IS NULL ORDER BY pengirim ASC LIMIT ?`
  const args: any[] = q ? [`%${q}%`, limit] : [limit]
  const res = await db.execute({ sql, args })
  return (res.rows as any[]).map((r) => r.pengirim).filter(Boolean)
})
