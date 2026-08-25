import { useDb } from '../../utils/db'

export default defineEventHandler(async () => {
  const db = useDb()
  const now = new Date()
  const ym = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar', year: 'numeric', month: '2-digit' }).format(now).slice(0, 7)

  const res = await db.execute({
    sql: `SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS draft,
      SUM(CASE WHEN status = 'menunggu_persetujuan' THEN 1 ELSE 0 END) AS menunggu_persetujuan,
      SUM(CASE WHEN status = 'ditolak' THEN 1 ELSE 0 END) AS ditolak,
      SUM(CASE WHEN status = 'terkirim' AND substr(tgl_surat, 1, 7) = ? THEN 1 ELSE 0 END) AS terkirim_bulan_ini
      FROM surat_keluar WHERE deleted_at IS NULL`,
    args: [ym]
  })
  const r = res.rows[0] as any
  return {
    total: Number(r.total) || 0,
    draft: Number(r.draft) || 0,
    menunggu_persetujuan: Number(r.menunggu_persetujuan) || 0,
    ditolak: Number(r.ditolak) || 0,
    terkirim_bulan_ini: Number(r.terkirim_bulan_ini) || 0
  }
})
