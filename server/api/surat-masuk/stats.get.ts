import { useDb } from '../../utils/db'

export default defineEventHandler(async () => {
  const db = useDb()
  const now = new Date()
  const ym = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar', year: 'numeric', month: '2-digit' }).format(now).slice(0, 7)
  const tigaHariLalu = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 3).toISOString().slice(0, 10)

  const res = await db.execute({
    sql: `SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN date(sm.tgl_terima) >= date(?) THEN 1 ELSE 0 END) AS baru,
      SUM(CASE WHEN NOT EXISTS (
        SELECT 1 FROM disposisi d WHERE d.surat_masuk_id = sm.id AND d.deleted_at IS NULL
      ) THEN 1 ELSE 0 END) AS belum_disposisi,
      SUM(CASE WHEN EXISTS (
        SELECT 1 FROM disposisi d WHERE d.surat_masuk_id = sm.id AND d.deleted_at IS NULL
        AND substr(d.created_at, 1, 7) = ?
      ) THEN 1 ELSE 0 END) AS didisposisi_bulan_ini
      FROM surat_masuk sm WHERE sm.deleted_at IS NULL`,
    args: [tigaHariLalu, ym]
  })
  const r = res.rows[0] as any
  return {
    total: Number(r.total) || 0,
    baru: Number(r.baru) || 0,
    belum_disposisi: Number(r.belum_disposisi) || 0,
    didisposisi_bulan_ini: Number(r.didisposisi_bulan_ini) || 0
  }
})
