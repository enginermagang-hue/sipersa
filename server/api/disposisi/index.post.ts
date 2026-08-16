import { useDb } from '../../utils/db'
import { disposisiSchema } from '../../../lib/validations'
import { logActivity } from '../../utils/logger'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  if (!['pimpinan', 'admin'].includes(auth.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Hanya pimpinan yang dapat membuat disposisi' })
  }
  const body = await readBody(event)
  const parsed = disposisiSchema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: 'Data tidak valid', data: parsed.error.issues })
  const data = parsed.data

  const db = useDb()
  const surat = await db.execute({ sql: 'SELECT * FROM surat_masuk WHERE id = ? AND deleted_at IS NULL', args: [data.surat_masuk_id] })
  if (surat.rows.length === 0) throw createError({ statusCode: 404, statusMessage: 'Surat tidak ditemukan' })

  const instruksiListJson = JSON.stringify(data.instruksi_list || [])
  const batasWaktu = data.batas_waktu || null
  const ids: number[] = []

  for (const kepadaUserId of data.kepada_user_ids) {
    const res = await db.execute({
      sql: `INSERT INTO disposisi (surat_masuk_id, dari_user_id, kepada_user_id, instruksi, instruksi_list, catatan, status, sifat_disposisi, batas_waktu, notify)
            VALUES (?, ?, ?, ?, ?, ?, 'baru', ?, ?, ?)`,
      args: [data.surat_masuk_id, auth.userId, kepadaUserId, data.instruksi || '', instruksiListJson, data.catatan || '', data.sifat_disposisi, batasWaktu, data.notify ? 1 : 0]
    })
    const id = Number((res.rows[0] as any)?.id ?? res.lastInsertRowid)
    ids.push(id)

    if (data.notify) {
      await db.execute({
        sql: `INSERT INTO notifications (user_id, title, message, entity, entity_id)
              VALUES (?, ?, ?, 'disposisi', ?)`,
        args: [kepadaUserId, 'Disposisi Baru', `Surat: ${(surat.rows[0] as any).no_surat}`, id]
      })
    }
  }

  await logActivity({ userId: auth.userId, action: 'CREATE_DISPOSISI', entity: 'disposisi', entityId: ids[0], detail: { kepada: data.kepada_user_ids, sifat: data.sifat_disposisi }, ip: getRequestIP(event, { xForwardedFor: true }) })
  return { ids, count: ids.length }
})
