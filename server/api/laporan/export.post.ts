import ExcelJS from 'exceljs'
import { parseLaporanQuery, validRange, queryLaporan } from '../../utils/laporan'
import { logActivity } from '../../utils/logger'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  if (!['admin', 'staff'].includes(auth.role)) {
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

  const instansiNama = process.env.NUXT_PUBLIC_INSTANSI_NAMA || ''
  const instansiUnit = process.env.NUXT_PUBLIC_INSTANSI_UNIT || ''
  const instansiAlamat = process.env.NUXT_PUBLIC_INSTANSI_ALAMAT || ''
  const lastCol = 'H'

  const kopRows: { text: string; font: Partial<ExcelJS.Font>; underline?: boolean }[] = [
    { text: instansiNama, font: { bold: true, size: 14 } },
    { text: instansiUnit, font: { bold: true, size: 12 } }
  ]
  if (instansiAlamat) kopRows.push({ text: instansiAlamat, font: { size: 10 } })
  kopRows.push({ text: 'LAPORAN PERSURATAN & ARSIP', font: { bold: true, size: 11 }, underline: true })

  let kopRow = 1
  for (const r of kopRows) {
    const cell = `A${kopRow}`
    ws.getCell(cell).value = r.text
    ws.getCell(cell).font = r.font
    if (r.underline) ws.getCell(cell).font = { ...r.font, underline: true }
    ws.getCell(cell).alignment = { horizontal: 'center' }
    ws.mergeCells(`A${kopRow}:${lastCol}${kopRow}`)
    kopRow++
  }

  const headerRow = kopRow + 1
  const headers = ['No', 'Jenis', 'No Surat', 'Tanggal', 'Asal / Tujuan', 'Perihal', 'Status', 'Lokasi']
  ws.getRow(headerRow).values = headers
  ws.getRow(headerRow).font = { bold: true }
  ;(rows as any[]).forEach((r, i) => {
    ws.getRow(headerRow + 1 + i).values = [i + 1, r.jenis, r.no_surat, r.tgl_surat, r.asal_tujuan, r.perihal, r.status, r.lokasi]
  })

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
