import ExcelJS from 'exceljs'
import { useDb } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const jenis = body.jenis === 'keluar' ? 'keluar' : 'masuk'
  const start = body.start as string
  const end = body.end as string
  const db = useDb()
  const table = jenis === 'masuk' ? 'surat_masuk' : 'surat_keluar'
  const wheres = ['deleted_at IS NULL']
  const args: any[] = []
  if (start) { wheres.push('tgl_surat >= ?'); args.push(start) }
  if (end) { wheres.push('tgl_surat <= ?'); args.push(end) }
  const rows = await db.execute({
    sql: `SELECT * FROM ${table} WHERE ${wheres.join(' AND ')} ORDER BY tgl_surat ASC`,
    args
  })

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Laporan')
  const headers = jenis === 'masuk'
    ? ['No', 'No Surat', 'Tgl Surat', 'Tgl Terima', 'Pengirim', 'Perihal', 'Sifat']
    : ['No', 'No Surat', 'Tgl Surat', 'Tujuan', 'Perihal', 'Sifat']
  ws.addRow(headers)
  ;(rows.rows as any[]).forEach((r, i) => {
    ws.addRow(
      jenis === 'masuk'
        ? [i + 1, r.no_surat, r.tgl_surat, r.tgl_terima, r.pengirim, r.perihal, r.sifat]
        : [i + 1, r.no_surat, r.tgl_surat, r.tujuan, r.perihal, r.sifat]
    )
  })

  const buf = await wb.xlsx.writeBuffer()
  setHeader(event, 'Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  setHeader(event, 'Content-Disposition', `attachment; filename="laporan-${jenis}-${Date.now()}.xlsx"`)
  return buf
})
