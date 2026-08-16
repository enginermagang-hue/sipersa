import { getQuery } from 'h3'
import { parseLaporanQuery, validRange, queryLaporan } from '../../utils/laporan'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  if (!['admin', 'staff_tu'].includes(auth.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Tidak diizinkan' })
  }

  const query = getQuery(event)
  const f = parseLaporanQuery(query)
  if (!validRange(f)) {
    throw createError({ statusCode: 422, statusMessage: 'Tanggal awal harus lebih kecil atau sama dengan tanggal akhir' })
  }

  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20))

  return await queryLaporan(f, { page, limit })
})
