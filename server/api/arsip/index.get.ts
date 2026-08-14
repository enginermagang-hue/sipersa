import { getQuery } from 'h3'
import { useDb } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const q = (query.q as string) || ''
  const tahun = query.tahun as string
  const klasId = query.klasifikasi_id as string

  const db = useDb()
  const wheres = ['a.deleted_at IS NULL']
  const args: any[] = []
  if (q) { wheres.push('(a.nama_dokumen LIKE ? OR a.lokasi LIKE ?)'); args.push(`%${q}%`, `%${q}%`) }
  if (tahun) { wheres.push('a.tahun = ?'); args.push(Number(tahun)) }
  if (klasId) { wheres.push('a.klasifikasi_id = ?'); args.push(Number(klasId)) }
  const where = wheres.join(' AND ')

  const rows = await db.execute({
    sql: `SELECT a.*, k.kode as klasifikasi_kode, k.nama as klasifikasi_nama
          FROM arsip a
          LEFT JOIN klasifikasi k ON k.id = a.klasifikasi_id
          WHERE ${where}
          ORDER BY a.tahun DESC, a.nama_dokumen ASC`,
    args
  })
  return rows.rows
})
