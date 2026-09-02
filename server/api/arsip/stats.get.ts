import { useDb } from '../../utils/db'

const musnahExpr = `CASE WHEN COALESCE(k.retensi_tahun, 0) = 0 THEN NULL ELSE CAST(strftime('%Y', a.tgl_arsip) AS INTEGER) + k.retensi_tahun END`

export default defineEventHandler(async () => {
  const db = useDb()
  const nowYear = `CAST(strftime('%Y', 'now') AS INTEGER)`
  const res = await db.execute({
    sql: `SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN (${musnahExpr} IS NULL OR ${musnahExpr} - ${nowYear} > 1) THEN 1 ELSE 0 END) AS aktif,
      SUM(CASE WHEN ${musnahExpr} IS NOT NULL AND ${musnahExpr} - ${nowYear} BETWEEN 0 AND 1 THEN 1 ELSE 0 END) AS menjelang,
      SUM(CASE WHEN ${musnahExpr} IS NOT NULL AND ${musnahExpr} < ${nowYear} THEN 1 ELSE 0 END) AS kadaluarsa
    FROM arsip a
    LEFT JOIN klasifikasi k ON k.id = a.klasifikasi_id
    WHERE a.deleted_at IS NULL`
  })
  const r = res.rows[0] as any
  return {
    total: Number(r.total) || 0,
    aktif: Number(r.aktif) || 0,
    menjelang: Number(r.menjelang) || 0,
    kadaluarsa: Number(r.kadaluarsa) || 0
  }
})
