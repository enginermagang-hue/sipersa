import { useDb } from '../../utils/db'
import { logActivity } from '../../utils/logger'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  const id = Number(event.context.params?.id)
  const body = await readBody(event)
  const db = useDb()
  await db.execute({
    sql: `UPDATE arsip SET
      klasifikasi_id = COALESCE(?, klasifikasi_id),
      nama_dokumen = COALESCE(?, nama_dokumen),
      lokasi = COALESCE(?, lokasi),
      tahun = COALESCE(?, tahun)
      WHERE id = ? AND deleted_at IS NULL`,
    args: [body.klasifikasi_id ?? null, body.nama_dokumen ?? null, body.lokasi ?? null, body.tahun ?? null, id]
  })
  await logActivity({ userId: auth.userId, action: 'UPDATE_ARSIP', entity: 'arsip', entityId: id, ip: getRequestIP(event, { xForwardedFor: true }) })
  return { ok: true }
})
