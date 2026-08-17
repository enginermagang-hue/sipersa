import { getQuery } from 'h3'
import { useDb } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const q = (query.q as string) || ''
  const sifat = query.sifat as string
  const status = query.status as string
  const tahun = query.tahun as string
  const bulan = query.bulan as string
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(query.perPage) || 20))
  const offset = (page - 1) * limit

  const db = useDb()
  const wheres = ['sm.deleted_at IS NULL']
  const args: any[] = []
  if (q) {
    wheres.push('(sm.perihal LIKE ? OR sm.pengirim LIKE ? OR sm.no_surat LIKE ?)')
    args.push(`%${q}%`, `%${q}%`, `%${q}%`)
  }
  if (sifat) {
    wheres.push('sm.sifat = ?')
    args.push(sifat)
  }
  if (status) {
    if (status === 'baru') {
      wheres.push('NOT EXISTS (SELECT 1 FROM disposisi d WHERE d.surat_masuk_id = sm.id AND d.deleted_at IS NULL)')
    } else {
      wheres.push(`(SELECT d.status FROM disposisi d WHERE d.surat_masuk_id = sm.id AND d.deleted_at IS NULL ORDER BY d.created_at DESC LIMIT 1) = ?`)
      args.push(status)
    }
  }
  if (tahun) {
    wheres.push('sm.no_surat LIKE ?')
    args.push(`%/${tahun}`)
  }
  if (bulan) {
    wheres.push('sm.tgl_terima LIKE ?')
    args.push(`${bulan}%`)
  }
  const where = wheres.join(' AND ')

  const countRes = await db.execute({
    sql: `SELECT COUNT(*) as c FROM surat_masuk sm WHERE ${where}`,
    args
  })
  const rows = await db.execute({
    sql: `SELECT sm.*, k.kode as klasifikasi_kode, k.nama as klasifikasi_nama,
          (SELECT d.status FROM disposisi d
           WHERE d.surat_masuk_id = sm.id AND d.deleted_at IS NULL
           ORDER BY d.created_at DESC LIMIT 1) as disposisi_status,
          EXISTS (SELECT 1 FROM arsip a WHERE a.ref_masuk_id = sm.id AND a.deleted_at IS NULL) as is_arsip
          FROM surat_masuk sm
          LEFT JOIN klasifikasi k ON k.id = sm.klasifikasi_id
          WHERE ${where}
          ORDER BY sm.created_at DESC
          LIMIT ? OFFSET ?`,
    args: [...args, limit, offset]
  })

  return { total: (countRes.rows[0] as any).c, page, limit, data: rows.rows }
})
