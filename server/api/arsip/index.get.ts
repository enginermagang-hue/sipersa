import { getQuery } from 'h3'
import { useDb } from '../../utils/db'

const musnahExpr = `CASE WHEN COALESCE(k.retensi_tahun, 0) = 0 THEN NULL
                    ELSE CAST(strftime('%Y', a.tgl_arsip) AS INTEGER) + k.retensi_tahun END`

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const q = (query.q as string) || ''
  const tahun = query.tahun as string
  const klasId = query.klasifikasi_id as string
  const status = query.status as string
  const refType = query.ref_type as string
  const deleted = query.deleted === '1' || query.deleted === 'true'
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20))
  const offset = (page - 1) * limit

  const db = useDb()
  const wheres = [deleted ? 'a.deleted_at IS NOT NULL' : 'a.deleted_at IS NULL']
  const args: any[] = []
  if (q) { wheres.push('(a.nama_dokumen LIKE ? OR a.lokasi LIKE ?)'); args.push(`%${q}%`, `%${q}%`) }
  if (tahun) { wheres.push('a.tahun = ?'); args.push(Number(tahun)) }
  if (klasId) { wheres.push('a.klasifikasi_id = ?'); args.push(Number(klasId)) }
  if (refType) {
    if (refType === 'masuk') wheres.push('a.ref_masuk_id IS NOT NULL')
    else if (refType === 'keluar') wheres.push('a.ref_keluar_id IS NOT NULL')
    else wheres.push('a.ref_masuk_id IS NULL AND a.ref_keluar_id IS NULL')
  }
  const nowYear = `CAST(strftime('%Y', 'now') AS INTEGER)`
  if (status) {
    if (status === 'aktif') wheres.push(`(${musnahExpr} IS NULL OR ${musnahExpr} - ${nowYear} > 1)`)
    else if (status === 'menjelang') wheres.push(`(${musnahExpr} IS NOT NULL AND ${musnahExpr} - ${nowYear} BETWEEN 0 AND 1)`)
    else if (status === 'kadaluarsa') wheres.push(`${musnahExpr} < ${nowYear}`)
  }
  const where = wheres.join(' AND ')

  const countRes = await db.execute({
    sql: `SELECT COUNT(*) as c FROM arsip a
          LEFT JOIN klasifikasi k ON k.id = a.klasifikasi_id
          LEFT JOIN surat_masuk sm ON sm.id = a.ref_masuk_id
          LEFT JOIN surat_keluar sk ON sk.id = a.ref_keluar_id
          WHERE ${where}`,
    args
  })
  const rows = await db.execute({
    sql: `SELECT a.*, k.kode as klasifikasi_kode, k.nama as klasifikasi_nama,
          COALESCE(k.retensi_tahun, 0) as retensi_tahun,
          ${musnahExpr} as tahun_musnah,
          sm.no_surat as no_surat_masuk, sk.no_surat as no_surat_keluar
          FROM arsip a
          LEFT JOIN klasifikasi k ON k.id = a.klasifikasi_id
          LEFT JOIN surat_masuk sm ON sm.id = a.ref_masuk_id
          LEFT JOIN surat_keluar sk ON sk.id = a.ref_keluar_id
          WHERE ${where}
          ORDER BY a.tahun DESC, a.nama_dokumen ASC
          LIMIT ? OFFSET ?`,
    args: [...args, limit, offset]
  })

  const nowY = new Date().getFullYear()
  const list = (rows.rows as any[]).map((r) => {
    const tm = r.tahun_musnah as number | null
    let status: 'aktif' | 'menjelang' | 'kadaluarsa' = 'aktif'
    let sisa: number | null = null
    if (tm != null) {
      sisa = tm - nowY
      if (sisa < 0) status = 'kadaluarsa'
      else if (sisa <= 1) status = 'menjelang'
    }
    return { ...r, status, sisa_tahun: sisa }
  })
  return { total: (countRes.rows[0] as any).c, page, limit, data: list }
})
