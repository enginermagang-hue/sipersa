import { useDb } from '../../utils/db'
import { klasifikasiSchema } from '../../../lib/validations'
import { logActivity } from '../../utils/logger'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  if (auth.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Hanya admin' })
  const id = Number(event.context.params?.id)
  const body = await readBody(event)
  const parsed = klasifikasiSchema.partial().safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: 'Data tidak valid', data: parsed.error.issues })
  const d = parsed.data
  const db = useDb()
  await db.execute({
    sql: 'UPDATE klasifikasi SET kode = COALESCE(?, kode), nama = COALESCE(?, nama), deskripsi = COALESCE(?, deskripsi), retensi_tahun = COALESCE(?, retensi_tahun) WHERE id = ? AND deleted_at IS NULL',
    args: [d.kode ?? null, d.nama ?? null, d.deskripsi ?? null, d.retensi_tahun ?? null, id]
  })
  await logActivity({ userId: auth.userId, action: 'UPDATE_KLASIFIKASI', entity: 'klasifikasi', entityId: id, ip: getRequestIP(event, { xForwardedFor: true }) })
  return { ok: true }
})
