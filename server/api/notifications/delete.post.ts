import { useDb } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  const db = useDb()
  const body = await readBody(event)
  const ids: number[] = Array.isArray(body?.ids) ? body.ids.map((v: any) => Number(v)).filter((n: number) => Number.isInteger(n) && n > 0) : []
  if (!ids.length) throw createError({ statusCode: 400, statusMessage: 'Pilih minimal satu notifikasi' })
  if (ids.length > 50) throw createError({ statusCode: 400, statusMessage: 'Maksimal 50 notifikasi' })
  const placeholders = ids.map(() => '?').join(',')
  await db.execute({ sql: `DELETE FROM notifications WHERE user_id = ? AND id IN (${placeholders})`, args: [auth.userId, ...ids] })
  return { ok: true, deleted: ids.length }
})
