import { useDb } from '../../utils/db'
import { logActivity } from '../../utils/logger'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  const id = Number(event.context.params?.id)
  const db = useDb()
  const surat = await db.execute({
    sql: 'SELECT created_by FROM surat_masuk WHERE id = ? AND deleted_at IS NULL',
    args: [id]
  })
  if (surat.rows.length === 0) throw createError({ statusCode: 404, statusMessage: 'Surat tidak ditemukan' })
  if (auth.role !== 'admin' && auth.userId !== (surat.rows[0] as any).created_by) {
    throw createError({ statusCode: 403, statusMessage: 'Hanya admin atau pembuat surat yang dapat menghapus' })
  }
  const res = await db.execute({ sql: 'UPDATE surat_masuk SET deleted_at = datetime(\'now\') WHERE id = ? AND deleted_at IS NULL', args: [id] })
  if ((res.rowsAffected ?? 0) === 0) throw createError({ statusCode: 404, statusMessage: 'Surat tidak ditemukan' })
  await logActivity({ userId: auth.userId, action: 'DELETE_SURAT_MASUK', entity: 'surat_masuk', entityId: id, ip: getRequestIP(event, { xForwardedFor: true }) })
  return { ok: true }
})
