import { useDb } from '../../../utils/db'
import { logActivity } from '../../../utils/logger'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  if (auth.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Hanya admin' })
  const id = Number(event.context.params?.id)
  if (id === auth.userId) throw createError({ statusCode: 400, statusMessage: 'Tidak bisa menonaktifkan diri sendiri' })
  const db = useDb()
  await db.execute({ sql: 'UPDATE users SET deleted_at = datetime(\'now\'), status = \'inactive\' WHERE id = ? AND deleted_at IS NULL', args: [id] })
  await logActivity({ userId: auth.userId, action: 'DELETE_USER', entity: 'users', entityId: id, ip: getRequestIP(event, { xForwardedFor: true }) })
  return { ok: true }
})
