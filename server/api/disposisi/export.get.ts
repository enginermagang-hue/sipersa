import ExcelJS from 'exceljs'
import { getQuery } from 'h3'
import { useDb } from '../../utils/db'
import { logActivity } from '../../utils/logger'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  const query = getQuery(event)
  const q = (query.q as string) || ''
  const status = query.status as string
  const sifat = query.sifat as string
  const bulan = query.bulan as string

  const db = useDb()
  const isManager = ['pimpinan', 'admin'].includes(auth.role)
  const wheres = isManager ? ['d.deleted_at IS NULL'] : ['d.deleted_at IS NULL AND d.kepada_user_id = ?']
  const args: any[] = isManager ? [] : [auth.userId]

  if (q) {
    wheres.push('(sm.no_surat LIKE ? OR sm.perihal LIKE ? OR u.nama LIKE ? OR u2.nama LIKE ?)')
    args.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`)
  }
  if (status) { wheres.push('d.status = ?'); args.push(status) }
  if (sifat) { wheres.push('d.sifat_disposisi = ?'); args.push(sifat) }
  if (bulan) { wheres.push('d.batas_waktu LIKE ?'); args.push(`${bulan}%`) }
  const where = wheres.join(' AND ')

  const rows = await db.execute({
    sql: `SELECT d.id, sm.no_surat, sm.perihal, u2.nama as dari_nama, u.nama as kepada_nama,
                 d.sifat_disposisi, d.status, d.batas_waktu, d.instruksi, d.created_at
           FROM disposisi d
           JOIN surat_masuk sm ON sm.id = d.surat_masuk_id
           JOIN users u ON u.id = d.kepada_user_id
           JOIN users u2 ON u2.id = d.dari_user_id
           WHERE ${where}
           ORDER BY d.batas_waktu ASC, d.created_at DESC`,
    args
  })

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Disposisi')
  const headers = ['No', 'No Surat', 'Perihal', 'Dari', 'Kepada', 'Sifat', 'Status', 'Batas Waktu', 'Instruksi']
  ws.addRow(headers)
  ;(rows.rows as any[]).forEach((r, i) => {
    ws.addRow([
      i + 1,
      r.no_surat,
      r.perihal,
      r.dari_nama,
      r.kepada_nama,
      r.sifat_disposisi,
      r.status,
      r.batas_waktu || '',
      r.instruksi || ''
    ])
  })
  ws.getRow(1).font = { bold: true }

  const buf = await wb.xlsx.writeBuffer()
  await logActivity({
    userId: auth.userId,
    action: 'EXPORT_DISPOSISI',
    entity: 'disposisi',
    detail: { q, status, sifat, rows: (rows.rows as any[]).length },
    ip: getRequestIP(event, { xForwardedFor: true })
  })

  setHeader(event, 'Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  setHeader(event, 'Content-Disposition', `attachment; filename="disposisi-${Date.now()}.xlsx"`)
  return buf
})
