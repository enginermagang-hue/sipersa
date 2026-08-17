import { getQuery } from 'h3'
import { useDb } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  const db = useDb()
  const isManager = ['pimpinan', 'admin'].includes(auth.role)
  const today = new Date().toISOString().slice(0, 10)

  const scope = isManager
    ? 'd.deleted_at IS NULL'
    : 'd.deleted_at IS NULL AND d.kepada_user_id = ?'
  const args: any[] = isManager ? [] : [auth.userId]

  const res = await db.execute({
    sql: `SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN d.status = 'baru' THEN 1 ELSE 0 END) AS baru,
      SUM(CASE WHEN d.status = 'diproses' THEN 1 ELSE 0 END) AS diproses,
      SUM(CASE WHEN d.status = 'selesai' THEN 1 ELSE 0 END) AS selesai,
      SUM(CASE WHEN d.batas_waktu IS NOT NULL AND d.batas_waktu < ? AND d.status != 'selesai' THEN 1 ELSE 0 END) AS lewat_batas,
      SUM(CASE WHEN d.sifat_disposisi IN ('segera', 'sangat_segera') THEN 1 ELSE 0 END) AS prioritas
      FROM disposisi d
      WHERE ${scope}`,
    args: [today, ...args]
  })
  const r = res.rows[0] as any
  return {
    total: Number(r.total) || 0,
    baru: Number(r.baru) || 0,
    diproses: Number(r.diproses) || 0,
    selesai: Number(r.selesai) || 0,
    lewat_batas: Number(r.lewat_batas) || 0,
    prioritas: Number(r.prioritas) || 0
  }
})
