import { getQuery } from 'h3'
import { useDb } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const q = ((query.q as string) || '').trim()
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 20))
  const db = useDb()
  const sql = q
    ? `SELECT DISTINCT tujuan FROM surat_keluar WHERE deleted_at IS NULL AND tujuan LIKE ? COLLATE NOCASE ORDER BY tujuan ASC LIMIT ?`
    : `SELECT DISTINCT tujuan FROM surat_keluar WHERE deleted_at IS NULL ORDER BY tujuan ASC LIMIT ?`
  const args: any[] = q ? [`%${q}%`, limit] : [limit]
  const res = await db.execute({ sql, args })
  return (res.rows as any[]).map((r) => r.tujuan).filter(Boolean)
})
