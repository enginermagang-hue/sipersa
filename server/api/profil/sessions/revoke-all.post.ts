import { useDb } from '../../../utils/db'
import { getCookie } from 'h3'
import { SESSION_COOKIE } from '../../../utils/session'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  const db = useDb()
  const token = getCookie(event, SESSION_COOKIE)

  const current = await db.execute({
    sql: 'SELECT id FROM sessions WHERE token = ? AND user_id = ? AND revoked = 0 AND expires_at > datetime("now")',
    args: [token, auth.userId]
  })
  const currentRow = current.rows[0] as any
  const currentId = currentRow?.id

  await db.execute({
    sql: 'UPDATE sessions SET revoked = 1 WHERE user_id = ? AND id != ? AND revoked = 0 AND expires_at > datetime("now")',
    args: [auth.userId, currentId]
  })

  return { success: true }
})
