import { useDb } from './db'

export const SESSION_COOKIE = 'sid'

function newToken(): string {
  return crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
}

export async function createSession(userId: number, ip: string, ua: string) {
  const db = useDb()
  const config = useRuntimeConfig()
  const maxAge = Number(config.sessionMaxAge) || 86400
  const expires = new Date(Date.now() + maxAge * 1000).toISOString()
  const token = newToken()
  await db.execute({
    sql: `INSERT INTO sessions (id, user_id, token, expires_at, ip_address, user_agent, last_active)
          VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
    args: [crypto.randomUUID(), userId, token, expires, ip, ua]
  })
  return { token, expires }
}

export async function getSessionUser(token: string | undefined) {
  if (!token) return null
  const db = useDb()
  const res = await db.execute({
    sql: `SELECT s.*, u.id as uid, u.nama, u.username, u.role, u.status, u.email
          FROM sessions s JOIN users u ON u.id = s.user_id
          WHERE s.token = ? AND s.revoked = 0 AND s.expires_at > datetime('now') AND u.deleted_at IS NULL`,
    args: [token]
  })
  if (res.rows.length === 0) return null
  const row = res.rows[0] as any
  await db.execute({
    sql: `UPDATE sessions SET last_active = datetime('now') WHERE token = ?`,
    args: [token]
  })
  return {
    sessionId: row.id,
    userId: row.uid,
    nama: row.nama,
    username: row.username,
    email: row.email,
    role: row.role,
    status: row.status
  }
}

export async function destroySession(token: string | undefined) {
  if (!token) return
  const db = useDb()
  await db.execute({ sql: 'UPDATE sessions SET revoked = 1 WHERE token = ?', args: [token] })
}

export async function revokeSession(sessionId: string) {
  const db = useDb()
  await db.execute({
    sql: 'UPDATE sessions SET revoked = 1 WHERE id = ?',
    args: [sessionId]
  })
}
