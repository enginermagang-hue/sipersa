import { useDb } from '../../utils/db'
import { logActivity } from '../../utils/logger'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  const body = await readBody(event)
  const db = useDb()
  const res = await db.execute({
    sql: `INSERT INTO arsip (ref_masuk_id, ref_keluar_id, klasifikasi_id, nama_dokumen, lokasi, tahun)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      body.ref_masuk_id ?? null,
      body.ref_keluar_id ?? null,
      body.klasifikasi_id ?? null,
      body.nama_dokumen,
      body.lokasi ?? null,
      body.tahun ?? null
    ]
  })
  await logActivity({ userId: auth.userId, action: 'CREATE_ARSIP', entity: 'arsip', entityId: Number(res.lastInsertRowid), ip: getRequestIP(event, { xForwardedFor: true }) })
  return { id: Number(res.lastInsertRowid) }
})
