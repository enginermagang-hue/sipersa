import { useDb } from '../../utils/db'

export default defineEventHandler(async () => {
  const db = useDb()
  const now = new Date()
  const ym = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar', year: 'numeric', month: '2-digit' }).format(now).slice(0, 7)

  const res = await db.execute({
    sql: `SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS draft,
      SUM(CASE WHEN status = 'proses_ttd' THEN 1 ELSE 0 END) AS proses_ttd,
      SUM(CASE WHEN status = 'terkirim' AND substr(tgl_surat, 1, 7) = ? THEN 1 ELSE 0 END) AS terkirim_bulan_ini
      FROM surat_keluar WHERE deleted_at IS NULL`,
    args: [ym]
  })
  const r = res.rows[0] as any
  return {
    total: Number(r.total) || 0,
    draft: Number(r.draft) || 0,
    proses_ttd: Number(r.proses_ttd) || 0,
    terkirim_bulan_ini: Number(r.terkirim_bulan_ini) || 0
  }
})
