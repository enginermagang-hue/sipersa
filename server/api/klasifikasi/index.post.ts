import { useDb } from '../../utils/db'
import { klasifikasiSchema } from '../../../lib/validations'
import { logActivity } from '../../utils/logger'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  if (auth.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Hanya admin' })
  const body = await readBody(event)
  const parsed = klasifikasiSchema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: 'Data tidak valid', data: parsed.error.issues })
  const d = parsed.data
  const db = useDb()
  const res = await db.execute({
    sql: 'INSERT INTO klasifikasi (kode, nama, deskripsi, retensi_tahun) VALUES (?, ?, ?, ?)',
    args: [d.kode, d.nama, d.deskripsi, d.retensi_tahun ?? null]
  })
  await logActivity({ userId: auth.userId, action: 'CREATE_KLASIFIKASI', entity: 'klasifikasi', entityId: Number(res.lastInsertRowid), ip: getRequestIP(event, { xForwardedFor: true }) })
  return { id: Number(res.lastInsertRowid) }
})
