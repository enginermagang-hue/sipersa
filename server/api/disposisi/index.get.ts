import { getQuery } from 'h3'
import { useDb } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  if (!['admin'].includes(auth.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Tidak diizinkan — Kelola Disposisi hanya untuk Admin' })
  }

  const query = getQuery(event)
  const q = (query.q as string) || ''
  const status = query.status as string
  const prioritas = query.prioritas as string
  const sifat = query.sifat as string
  const bulan = query.bulan as string
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(query.perPage) || 20))
  const offset = (page - 1) * limit

  const db = useDb()
  const wheres = ['d.deleted_at IS NULL']
  const args: any[] = []
  if (q) {
    wheres.push('(sm.no_surat LIKE ? OR sm.perihal LIKE ? OR u.nama LIKE ? OR u2.nama LIKE ?)')
    args.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`)
  }
  if (status) {
    wheres.push('d.status = ?')
    args.push(status)
  }
  if (prioritas) {
    wheres.push('d.prioritas = ?')
    args.push(prioritas)
  }
  if (sifat) {
    wheres.push('d.sifat_disposisi = ?')
    args.push(sifat)
  }
  if (bulan) {
    wheres.push('d.batas_waktu LIKE ?')
    args.push(`${bulan}%`)
  }
  const where = wheres.join(' AND ')

  const countRes = await db.execute({
    sql: `SELECT COUNT(*) as c
          FROM disposisi d
          JOIN surat_masuk sm ON sm.id = d.surat_masuk_id
          JOIN users u ON u.id = d.kepada_user_id
          JOIN users u2 ON u2.id = d.dari_user_id
          WHERE ${where}`,
    args
  })

  const rows = await db.execute({
    sql: `SELECT d.id, d.surat_masuk_id, d.parent_id, d.dari_user_id, d.kepada_user_id,
                 d.instruksi, d.catatan, d.status, d.prioritas, d.batas_waktu,
                 d.diproses_at, d.selesai_at, d.created_at,
                 sm.no_surat, sm.perihal, u.nama as kepada_nama, u2.nama as dari_nama
          FROM disposisi d
          JOIN surat_masuk sm ON sm.id = d.surat_masuk_id
          JOIN users u ON u.id = d.kepada_user_id
          JOIN users u2 ON u2.id = d.dari_user_id
          WHERE ${where}
          ORDER BY d.created_at DESC
          LIMIT ? OFFSET ?`,
    args: [...args, limit, offset]
  })

  return { total: (countRes.rows[0] as any).c, page, limit, data: rows.rows }
})
