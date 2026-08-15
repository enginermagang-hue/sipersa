import { useDb } from '../../../utils/db'
import { teruskanSchema } from '../../../../lib/validations'
import { logActivity } from '../../../utils/logger'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  const id = Number(event.context.params?.id)
  const body = await readBody(event)
  const parsed = teruskanSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 422, statusMessage: 'Data tidak valid', data: parsed.error.issues })
  }
  const data = parsed.data

  const db = useDb()
  const parent = await db.execute({
    sql: `SELECT * FROM disposisi WHERE id = ? AND deleted_at IS NULL`,
    args: [id]
  })
  if (parent.rows.length === 0) {
    throw createError({ statusCode: 404, statusMessage: 'Disposisi tidak ditemukan' })
  }
  const p = parent.rows[0] as any
  if (p.kepada_user_id !== auth.userId) {
    throw createError({ statusCode: 403, statusMessage: 'Hanya penerima disposisi yang dapat meneruskan' })
  }
  if (p.status === 'selesai') {
    throw createError({ statusCode: 422, statusMessage: 'Disposisi sudah selesai, tidak dapat diteruskan' })
  }
  if (data.kepada_user_id === auth.userId) {
    throw createError({ statusCode: 422, statusMessage: 'Tidak dapat meneruskan ke diri sendiri' })
  }

  const res = await db.execute({
    sql: `INSERT INTO disposisi (surat_masuk_id, parent_id, dari_user_id, kepada_user_id, instruksi, catatan, status, prioritas, batas_waktu)
          VALUES (?, ?, ?, ?, ?, ?, 'baru', ?, ?)`,
    args: [
      p.surat_masuk_id,
      p.id,
      auth.userId,
      data.kepada_user_id,
      data.instruksi,
      data.catatan,
      data.prioritas,
      data.batas_waktu || null
    ]
  })
  const newId = Number((res.rows[0] as any)?.id ?? res.lastInsertRowid)

  const surat = await db.execute({
    sql: `SELECT no_surat FROM surat_masuk WHERE id = ?`,
    args: [p.surat_masuk_id]
  })
  await db.execute({
    sql: `INSERT INTO notifications (user_id, title, message, entity, entity_id)
          VALUES (?, ?, ?, 'disposisi', ?)`,
    args: [
      data.kepada_user_id,
      'Disposisi Diteruskan',
      `Surat: ${(surat.rows[0] as any)?.no_surat ?? ''}`,
      newId
    ]
  })

  await logActivity({
    userId: auth.userId,
    action: 'FORWARD_DISPOSISI',
    entity: 'disposisi',
    entityId: newId,
    detail: { parent_id: p.id, kepada: data.kepada_user_id, prioritas: data.prioritas, batas_waktu: data.batas_waktu || null },
    ip: getRequestIP(event, { xForwardedFor: true })
  })

  return { id: newId }
})
