import { getQuery } from 'h3'
import { useDb } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const q = (query.q as string) || ''
  const sifat = query.sifat as string
  const tahun = query.tahun as string
  const page = Math.max(1, Number(query.page) || 1)
  const limit = 20
  const offset = (page - 1) * limit

  const db = useDb()
  const wheres = ['sk.deleted_at IS NULL']
  const args: any[] = []
  if (q) {
    wheres.push('(sk.perihal LIKE ? OR sk.tujuan LIKE ? OR sk.no_surat LIKE ?)')
    args.push(`%${q}%`, `%${q}%`, `%${q}%`)
  }
  if (sifat) { wheres.push('sk.sifat = ?'); args.push(sifat) }
  if (tahun) { wheres.push('sk.no_surat LIKE ?'); args.push(`%/${tahun}`) }
  const where = wheres.join(' AND ')

  const countRes = await db.execute({ sql: `SELECT COUNT(*) as c FROM surat_keluar sk WHERE ${where}`, args })
  const rows = await db.execute({
    sql: `SELECT sk.*, k.kode as klasifikasi_kode, k.nama as klasifikasi_nama
          FROM surat_keluar sk
          LEFT JOIN klasifikasi k ON k.id = sk.klasifikasi_id
          WHERE ${where}
          ORDER BY sk.created_at DESC
          LIMIT ? OFFSET ?`,
    args: [...args, limit, offset]
  })
  return { total: (countRes.rows[0] as any).c, page, limit, data: rows.rows }
})
