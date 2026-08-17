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
  const wheres = ['sm.deleted_at IS NULL']
  const args: any[] = []
  if (q) {
    wheres.push('(sm.perihal LIKE ? OR sm.pengirim LIKE ? OR sm.no_surat LIKE ?)')
    args.push(`%${q}%`, `%${q}%`, `%${q}%`)
  }
  if (sifat) { wheres.push('sm.sifat = ?'); args.push(sifat) }
  if (status) {
    if (status === 'baru') {
      wheres.push('NOT EXISTS (SELECT 1 FROM disposisi d WHERE d.surat_masuk_id = sm.id AND d.deleted_at IS NULL)')
    } else {
      wheres.push(`(SELECT d.status FROM disposisi d WHERE d.surat_masuk_id = sm.id AND d.deleted_at IS NULL ORDER BY d.created_at DESC LIMIT 1) = ?`)
      args.push(status)
    }
  }
  if (tahun) { wheres.push('sm.no_surat LIKE ?'); args.push(`%/${tahun}`) }
  if (bulan) { wheres.push('sm.tgl_terima LIKE ?'); args.push(`${bulan}%`) }
  const where = wheres.join(' AND ')

  const rows = await db.execute({
    sql: `SELECT sm.no_surat, sm.tgl_surat, sm.tgl_terima, sm.pengirim, sm.perihal, sm.sifat,
                 k.nama AS klasifikasi_nama,
                 (SELECT d.status FROM disposisi d WHERE d.surat_masuk_id = sm.id AND d.deleted_at IS NULL ORDER BY d.created_at DESC LIMIT 1) as disposisi_status,
                 EXISTS (SELECT 1 FROM arsip a WHERE a.ref_masuk_id = sm.id AND a.deleted_at IS NULL) as is_arsip
           FROM surat_masuk sm
           LEFT JOIN klasifikasi k ON k.id = sm.klasifikasi_id
           WHERE ${where}
           ORDER BY sm.tgl_terima DESC`,
    args
  })

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Surat Masuk')
  const headers = ['No', 'No Surat', 'Tgl Surat', 'Tgl Terima', 'Pengirim', 'Perihal', 'Sifat', 'Klasifikasi', 'Disposisi', 'Arsip']
  ws.addRow(headers)
  ;(rows.rows as any[]).forEach((r, i) => {
    ws.addRow([
      i + 1,
      r.no_surat,
      r.tgl_surat,
      r.tgl_terima,
      r.pengirim,
      r.perihal,
      r.sifat,
      r.klasifikasi_nama || '',
      r.disposisi_status || 'baru',
      r.is_arsip ? 'Ya' : 'Tidak'
    ])
  })
  ws.getRow(1).font = { bold: true }

  const buf = await wb.xlsx.writeBuffer()
  await logActivity({
    userId: auth.userId,
    action: 'EXPORT_SURAT_MASUK',
    entity: 'surat_masuk',
    detail: { q, status, sifat, rows: (rows.rows as any[]).length },
    ip: getRequestIP(event, { xForwardedFor: true })
  })

  setHeader(event, 'Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  setHeader(event, 'Content-Disposition', `attachment; filename="surat-masuk-${Date.now()}.xlsx"`)
  return buf
})
