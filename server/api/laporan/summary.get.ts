import { getQuery } from 'h3'
import { parseLaporanQuery, validRange, laporanSummary, laporanTrend } from '../../utils/laporan'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  if (!['admin', 'staff'].includes(auth.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Tidak diizinkan' })
  }

  const f = parseLaporanQuery(getQuery(event))
  if (!validRange(f)) {
    throw createError({ statusCode: 422, statusMessage: 'Tanggal awal harus lebih kecil atau sama dengan tanggal akhir' })
  }

  const [summary, trend] = await Promise.all([laporanSummary(f), laporanTrend()])
  return { ...summary, trend }
})
