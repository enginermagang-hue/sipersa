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
  const kepadaUserId = data.kepada_user_ids[0]
  if (kepadaUserId === auth.userId) {
    throw createError({ statusCode: 422, statusMessage: 'Tidak dapat meneruskan ke diri sendiri' })
  }
  const targetUser = await db.execute({ sql: 'SELECT role FROM users WHERE id = ? AND deleted_at IS NULL', args: [kepadaUserId] })
  if (targetUser.rows.length === 0) throw createError({ statusCode: 404, statusMessage: 'Penerima tidak ditemukan' })
  if (['pimpinan', 'admin'].includes((targetUser.rows[0] as any).role)) {
    throw createError({ statusCode: 403, statusMessage: 'Tidak dapat meneruskan ke pimpinan atau admin' })
  }

  const instruksiListJson = JSON.stringify((data as any).instruksi_list || [])
  const res = await db.execute({
    sql: `INSERT INTO disposisi (surat_masuk_id, parent_id, dari_user_id, kepada_user_id, instruksi, instruksi_list, catatan, status, sifat_disposisi, batas_waktu, notify)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'baru', ?, ?, ?)`,
    args: [
      p.surat_masuk_id,
      p.id,
      auth.userId,
      kepadaUserId,
      data.instruksi,
      instruksiListJson,
      data.catatan,
      data.sifat_disposisi,
      data.batas_waktu || null,
      (data as any).notify ? 1 : 0
    ]
  })
  const newId = Number((res.rows[0] as any)?.id ?? res.lastInsertRowid)
  await db.execute({ sql: `UPDATE disposisi SET status='diproses', diproses_at=COALESCE(diproses_at, datetime('now')) WHERE id=? AND status='baru'`, args: [p.id] })
  await db.execute({ sql: `UPDATE surat_masuk SET status='ditindaklanjuti' WHERE id=? AND status IN ('diterima','didisposisikan')`, args: [p.surat_masuk_id] })

  const surat = await db.execute({
    sql: `SELECT no_surat FROM surat_masuk WHERE id = ?`,
    args: [p.surat_masuk_id]
  })
  await db.execute({
    sql: `INSERT INTO notifications (user_id, title, message, entity, entity_id)
          VALUES (?, ?, ?, 'disposisi', ?)`,
    args: [
      kepadaUserId,
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
    detail: { parent_id: p.id, kepada: kepadaUserId, sifat_disposisi: data.sifat_disposisi, batas_waktu: data.batas_waktu || null },
    ip: getRequestIP(event, { xForwardedFor: true })
  })

  // WhatsApp Fonnte — selalu ke penerima (selama punya no_hp)
  try {
    const { buildDisposisiMessage, queueWa } = await import('../../../utils/fonnte')
    const config = useRuntimeConfig() as any
    const appUrl = (config.appUrl || '').trim().replace(/\/$/, '') || getHeader(event, 'origin') || ''
    const sRes = await db.execute({ sql: `SELECT no_surat, perihal, pengirim FROM surat_masuk WHERE id=?`, args: [p.surat_masuk_id] })
    const s = (sRes.rows[0] as any) || {}
    const uRes = await db.execute({ sql: `SELECT nama, no_hp FROM users WHERE id=?`, args: [kepadaUserId] })
    const u = (uRes.rows[0] as any)
    if (u?.no_hp) {
      const msg = buildDisposisiMessage({
        namaPenerima: u.nama, noSurat: s.no_surat || '', perihal: s.perihal || '', pengirim: s.pengirim || '',
        sifat: data.sifat_disposisi, prioritas: 'normal',
        instruksi: ((data as any).instruksi_list || []).join(', ') || data.instruksi || '-',
        batasWaktu: data.batas_waktu || null, namaPengirim: auth.nama || String(auth.userId), disposisiId: newId, appUrl
      })
      await queueWa(u.no_hp, kepadaUserId, msg, 'disposisi', newId)
      const { processOutboxBatch } = await import('../../../utils/fonnte')
      setImmediate(() => processOutboxBatch().catch(() => {}))
    }
  } catch {}

  return { id: newId }
})
