import { useDb } from '../../utils/db'
import { logActivity } from '../../utils/logger'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  const id = Number(event.context.params?.id)
  const body = await readBody(event)
  const status = body.status as string
  if (!['baru', 'diproses', 'selesai'].includes(status)) {
    throw createError({ statusCode: 422, statusMessage: 'Status tidak valid' })
  }
  const db = useDb()
  await db.execute({
    sql: `UPDATE disposisi SET status = ?, catatan = COALESCE(?, catatan) WHERE id = ? AND kepada_user_id = ? AND deleted_at IS NULL`,
    args: [status, body.catatan ?? null, id, auth.userId]
  })
  await logActivity({ userId: auth.userId, action: 'UPDATE_DISPOSISI', entity: 'disposisi', entityId: id, detail: { status }, ip: getRequestIP(event, { xForwardedFor: true }) })
  return { ok: true }
})
