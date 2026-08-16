import ExcelJS from 'exceljs'
import { parseLaporanQuery, validRange, queryLaporan } from '../../utils/laporan'
import { logActivity } from '../../utils/logger'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  if (!['admin', 'staff_tu'].includes(auth.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Tidak diizinkan' })
  }

  const body = await readBody(event)
  const f = parseLaporanQuery(body)
  if (!validRange(f)) {
    throw createError({ statusCode: 422, statusMessage: 'Tanggal awal harus lebih kecil atau sama dengan tanggal akhir' })
  }

  const { data: rows } = await queryLaporan(f, { page: 1, limit: 100000 })

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Laporan')
  const headers = ['No', 'Jenis', 'No Surat', 'Tanggal', 'Asal / Tujuan', 'Perihal', 'Status', 'Lokasi']
  ws.addRow(headers)
  ;(rows as any[]).forEach((r, i) => {
    ws.addRow([i + 1, r.jenis, r.no_surat, r.tgl_surat, r.asal_tujuan, r.perihal, r.status, r.lokasi])
  })
  ws.getRow(1).font = { bold: true }

  const buf = await wb.xlsx.writeBuffer()
  await logActivity({
    userId: auth.userId,
    action: 'EXPORT_LAPORAN',
    entity: 'laporan',
    detail: { tab: f.tab, start: f.start, end: f.end, klasifikasi_id: f.klasifikasiId, q: f.q, rows: (rows as any[]).length },
    ip: getRequestIP(event, { xForwardedFor: true })
  })

  setHeader(event, 'Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  setHeader(event, 'Content-Disposition', `attachment; filename="laporan-${f.tab}-${Date.now()}.xlsx"`)
  return buf
})
