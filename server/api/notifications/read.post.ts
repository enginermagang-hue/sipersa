import { useDb } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  const db = useDb()
  const body = await readBody(event)
  if (body.all) {
    await db.execute({ sql: 'UPDATE notifications SET "read" = 1 WHERE user_id = ?', args: [auth.userId] })
  } else if (body.id) {
    await db.execute({ sql: 'UPDATE notifications SET "read" = 1 WHERE id = ? AND user_id = ?', args: [Number(body.id), auth.userId] })
  }
  return { ok: true }
})
