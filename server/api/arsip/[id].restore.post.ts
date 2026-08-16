import { useDb } from '../../utils/db'
import { logActivity } from '../../utils/logger'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  const id = Number(event.context.params?.id)
  const db = useDb()
  await db.execute({ sql: 'UPDATE arsip SET deleted_at = NULL WHERE id = ?', args: [id] })
  await logActivity({
    userId: auth.userId,
    action: 'RESTORE_ARSIP',
    entity: 'arsip',
    entityId: id,
    ip: getRequestIP(event, { xForwardedFor: true })
  })
  return { ok: true }
})
