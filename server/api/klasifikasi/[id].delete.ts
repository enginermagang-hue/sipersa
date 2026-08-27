import { useDb } from '../../utils/db'
import { logActivity } from '../../utils/logger'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  if (auth.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Hanya admin' })
  const id = Number(event.context.params?.id)
  const db = useDb()
  await db.execute({ sql: "UPDATE klasifikasi SET deleted_at = datetime('now') WHERE id = ? AND deleted_at IS NULL", args: [id] })
  await logActivity({ userId: auth.userId, action: 'DELETE_KLASIFIKASI', entity: 'klasifikasi', entityId: id, ip: getRequestIP(event, { xForwardedFor: true }) })
  return { ok: true }
})
