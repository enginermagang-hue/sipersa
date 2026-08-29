import { useDb } from '../utils/db'
import { laporanTrend } from '../utils/laporan'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  const q: any = getQuery(event)
  const months = [3, 6, 9, 12].includes(Number(q.period)) ? Number(q.period) : 6
  const klasifikasiId = q.klasifikasi_id ? Number(q.klasifikasi_id) : null
  const db = useDb()
  const today = new Date().toISOString().slice(0, 10)
  const firstDayMonth = today.slice(0, 7) + '-01'

  const count = async (sql: string, args: any[] = []) => (await db.execute({ sql, args })).rows[0] as any

  const klasFilter = klasifikasiId ? ' AND klasifikasi_id = ?' : ''
  const klasArgs: any[] = klasifikasiId ? [klasifikasiId] : []

  const [masuk, keluar, arsip, disposisiSaya, disposisiOverdue, masukHariIni, arsipBulan, keluarPending, trend, pendingList, recentMasuk, approvalQueue, klasifikasiDist, aktivitas, batasWaktu, disposisiStats] = await Promise.all([
    count(`SELECT COUNT(*) as c FROM surat_masuk WHERE deleted_at IS NULL${klasFilter}`, klasArgs).then(r => Number(r.c) || 0),
    count(`SELECT COUNT(*) as c FROM surat_keluar WHERE deleted_at IS NULL${klasFilter}`, klasArgs).then(r => Number(r.c) || 0),
    count(`SELECT COUNT(*) as c FROM arsip WHERE deleted_at IS NULL${klasFilter}`, klasArgs).then(r => Number(r.c) || 0),
    count(`SELECT COUNT(*) as c FROM disposisi WHERE kepada_user_id = ? AND deleted_at IS NULL AND status != 'selesai'`, [auth.userId]).then(r => Number(r.c) || 0),
    count(`SELECT COUNT(*) as c FROM disposisi WHERE kepada_user_id = ? AND deleted_at IS NULL AND status != 'selesai' AND batas_waktu IS NOT NULL AND batas_waktu < date('now')`, [auth.userId]).then(r => Number(r.c) || 0),
    count(`SELECT COUNT(*) as c FROM surat_masuk WHERE deleted_at IS NULL AND tgl_surat = ?${klasFilter}`, [today, ...klasArgs]).then(r => Number(r.c) || 0),
    count(`SELECT COUNT(*) as c FROM arsip WHERE deleted_at IS NULL AND tgl_arsip >= ?${klasFilter}`, [firstDayMonth, ...klasArgs]).then(r => Number(r.c) || 0),
    count(`SELECT COUNT(*) as c FROM surat_keluar WHERE deleted_at IS NULL AND status IN ('draft','submitted')${klasFilter}`, klasArgs).then(r => Number(r.c) || 0),
    laporanTrend({ months, klasifikasiId }),
    db.execute({ sql: `SELECT d.id, d.surat_masuk_id, d.prioritas, d.batas_waktu, d.status, d.instruksi, sm.no_surat, sm.perihal, sm.sifat, sm.pengirim FROM disposisi d JOIN surat_masuk sm ON sm.id=d.surat_masuk_id WHERE d.kepada_user_id=? AND d.deleted_at IS NULL AND d.status != 'selesai' ORDER BY CASE WHEN d.batas_waktu IS NULL THEN 1 ELSE 0 END, d.batas_waktu ASC LIMIT 5`, args: [auth.userId] }).then(r => r.rows),
    db.execute({ sql: `SELECT sm.id, sm.no_surat, sm.pengirim, sm.perihal, sm.tgl_surat, sm.tgl_terima, sm.sifat, sm.file_drive_id, k.nama as klasifikasi_nama FROM surat_masuk sm LEFT JOIN klasifikasi k ON k.id=sm.klasifikasi_id WHERE sm.deleted_at IS NULL ORDER BY sm.tgl_terima DESC, sm.id DESC LIMIT 6` }).then(r => r.rows),
    (['admin','pimpinan'].includes(auth.role) ? db.execute({ sql: `SELECT id, no_surat, tujuan, perihal, status, created_at FROM surat_keluar WHERE deleted_at IS NULL AND status IN ('draft','submitted') ORDER BY created_at DESC LIMIT 5` }).then(r=>r.rows) : Promise.resolve([])),
    db.execute({ sql: `SELECT COALESCE(k.nama,'Tanpa Klasifikasi') as nama, COUNT(*) as n FROM (SELECT klasifikasi_id FROM surat_masuk WHERE deleted_at IS NULL ${klasFilter} UNION ALL SELECT klasifikasi_id FROM surat_keluar WHERE deleted_at IS NULL ${klasFilter}) x LEFT JOIN klasifikasi k ON k.id=x.klasifikasi_id GROUP BY x.klasifikasi_id ORDER BY n DESC`, args: [...klasArgs,...klasArgs] }).then(r => r.rows),
    db.execute({ sql: `SELECT a.id, a.action, a.entity, a.detail, a.created_at, u.nama as user_nama FROM activity_log a LEFT JOIN users u ON u.id=a.user_id ORDER BY a.created_at DESC LIMIT 5` }).then(r=>r.rows),
    db.execute({ sql: `SELECT d.id, d.surat_masuk_id, d.batas_waktu, d.prioritas, d.status, d.instruksi, sm.no_surat, sm.perihal, sm.sifat, sm.pengirim FROM disposisi d JOIN surat_masuk sm ON sm.id=d.surat_masuk_id WHERE d.kepada_user_id=? AND d.deleted_at IS NULL AND d.status != 'selesai' AND d.batas_waktu IS NOT NULL AND d.batas_waktu <= date('now','+7 days') ORDER BY d.batas_waktu ASC LIMIT 5`, args:[auth.userId] }).then(r=>r.rows),
    db.execute({ sql: `SELECT COUNT(*) as total, SUM(CASE WHEN status='baru' THEN 1 ELSE 0 END) as baru, SUM(CASE WHEN status='diproses' THEN 1 ELSE 0 END) as diproses, SUM(CASE WHEN status='selesai' THEN 1 ELSE 0 END) as selesai, SUM(CASE WHEN batas_waktu < ? AND status != 'selesai' THEN 1 ELSE 0 END) as lewat FROM disposisi WHERE ${['admin','pimpinan'].includes(auth.role) ? 'deleted_at IS NULL' : 'deleted_at IS NULL AND kepada_user_id=?'}`, args: (['admin','pimpinan'].includes(auth.role) ? [today] : [today, auth.userId]) }).then(r=>r.rows[0] as any),
  ])

  return { kpi: { masuk, keluar, arsip, disposisiSaya, disposisiOverdue, masukHariIni, arsipBulan, keluarPending }, trend, pendingList, recentMasuk, approvalQueue, klasifikasiDist, aktivitas, batasWaktu, disposisiStats }
})
