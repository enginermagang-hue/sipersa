import { useDb } from '../../utils/db'
import { logActivity } from '../../utils/logger'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  const id = Number(event.context.params?.id)
  const db = useDb()
  const exist = await db.execute({ sql: 'SELECT * FROM surat_keluar WHERE id = ? AND deleted_at IS NULL', args: [id] })
  if (exist.rows.length === 0) throw createError({ statusCode: 404, statusMessage: 'Surat tidak ditemukan' })
  const surat = exist.rows[0] as any
  if (surat.status === 'draft' && auth.role !== 'admin' && surat.created_by !== auth.userId) {
    throw createError({ statusCode: 403, statusMessage: 'Hanya pembuat atau admin yang dapat menghapus draft' })
  }
  const res = await db.execute({ sql: 'UPDATE surat_keluar SET deleted_at = datetime(\'now\') WHERE id = ? AND deleted_at IS NULL', args: [id] })
  if ((res.rowsAffected ?? 0) === 0) throw createError({ statusCode: 404, statusMessage: 'Surat tidak ditemukan' })
  await logActivity({ userId: auth.userId, action: 'DELETE_SURAT_KELUAR', entity: 'surat_keluar', entityId: id, ip: getRequestIP(event, { xForwardedFor: true }) })
  return { ok: true }
})
