import ExcelJS from 'exceljs'
import { getQuery } from 'h3'
import { useDb } from '../../utils/db'
import { logActivity } from '../../utils/logger'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  const query = getQuery(event)
  const q = (query.q as string) || ''
  const sifat = query.sifat as string
  const status = query.status as string
  const tahun = query.tahun as string
  const bulan = query.bulan as string

  const db = useDb()
  const wheres = ['sk.deleted_at IS NULL']
  const args: any[] = []
  if (q) {
    wheres.push('(sk.perihal LIKE ? OR sk.tujuan LIKE ? OR sk.no_surat LIKE ? OR sk.penandatangan LIKE ?)')
    args.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`)
  }
  if (sifat) { wheres.push('sk.sifat = ?'); args.push(sifat) }
  if (status) { wheres.push('sk.status = ?'); args.push(status) }
  if (tahun) { wheres.push('sk.tgl_surat LIKE ?'); args.push(`${tahun}%`) }
  if (bulan) { wheres.push('sk.tgl_surat LIKE ?'); args.push(`${bulan}%`) }
  const where = wheres.join(' AND ')

  const rows = await db.execute({
    sql: `SELECT sk.no_surat, sk.tgl_surat, sk.tujuan, sk.perihal, sk.sifat, sk.status,
                 COALESCE(sk.penandatangan, '') AS penandatangan, k.nama AS klasifikasi_nama
          FROM surat_keluar sk
          LEFT JOIN klasifikasi k ON k.id = sk.klasifikasi_id
          WHERE ${where}
          ORDER BY sk.tgl_surat DESC`,
    args
  })

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Surat Keluar')
  const headers = ['No', 'No Surat', 'Tanggal', 'Tujuan', 'Perihal', 'Penandatangan', 'Sifat', 'Status', 'Klasifikasi']
  ws.addRow(headers)
  ;(rows.rows as any[]).forEach((r, i) => {
    ws.addRow([i + 1, r.no_surat, r.tgl_surat, r.tujuan, r.perihal, r.penandatangan, r.sifat, r.status, r.klasifikasi_nama || ''])
  })
  ws.getRow(1).font = { bold: true }

  const buf = await wb.xlsx.writeBuffer()
  await logActivity({
    userId: auth.userId,
    action: 'EXPORT_SURAT_KELUAR',
    entity: 'surat_keluar',
    detail: { q, status, sifat, rows: (rows.rows as any[]).length },
    ip: getRequestIP(event, { xForwardedFor: true })
  })

  setHeader(event, 'Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  setHeader(event, 'Content-Disposition', `attachment; filename="surat-keluar-${Date.now()}.xlsx"`)
  return buf
})
