import { useDb } from '../../utils/db'
import { disposisiSchema } from '../../../lib/validations'
import { logActivity } from '../../utils/logger'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  const body = await readBody(event)
  const parsed = disposisiSchema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: 'Data tidak valid', data: parsed.error.issues })
  const data = parsed.data

  const db = useDb()
  const surat = await db.execute({ sql: 'SELECT * FROM surat_masuk WHERE id = ? AND deleted_at IS NULL', args: [data.surat_masuk_id] })
  if (surat.rows.length === 0) throw createError({ statusCode: 404, statusMessage: 'Surat tidak ditemukan' })

  const res = await db.execute({
    sql: `INSERT INTO disposisi (surat_masuk_id, dari_user_id, kepada_user_id, instruksi, catatan, status)
          VALUES (?, ?, ?, ?, ?, 'baru')`,
    args: [data.surat_masuk_id, auth.userId, data.kepada_user_id, data.instruksi, data.catatan]
  })
  const id = Number((res.rows[0] as any)?.id ?? res.lastInsertRowid)

  await db.execute({
    sql: `INSERT INTO notifications (user_id, title, message, entity, entity_id)
          VALUES (?, ?, ?, 'disposisi', ?)`,
    args: [data.kepada_user_id, 'Disposisi Baru', `Surat: ${(surat.rows[0] as any).no_surat}`, id]
  })

  await logActivity({ userId: auth.userId, action: 'CREATE_DISPOSISI', entity: 'disposisi', entityId: id, detail: { kepada: data.kepada_user_id }, ip: getRequestIP(event, { xForwardedFor: true }) })
  return { id }
})
