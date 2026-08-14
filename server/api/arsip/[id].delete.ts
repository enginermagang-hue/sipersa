import { useDb } from '../../utils/db'
import { logActivity } from '../../utils/logger'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  const id = Number(event.context.params?.id)
  const db = useDb()
  await db.execute({ sql: 'UPDATE arsip SET deleted_at = datetime(\'now\') WHERE id = ? AND deleted_at IS NULL', args: [id] })
  await logActivity({ userId: auth.userId, action: 'DELETE_ARSIP', entity: 'arsip', entityId: id, ip: getRequestIP(event, { xForwardedFor: true }) })
  return { ok: true }
})
