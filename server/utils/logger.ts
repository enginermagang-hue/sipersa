import { useDb } from './db'

export interface ActivityInput {
  userId?: number | null
  action: string
  entity?: string
  entityId?: number | null
  detail?: unknown
  ip?: string
}

export async function logActivity(input: ActivityInput) {
  const db = useDb()
  await db.execute({
    sql: `INSERT INTO activity_log (user_id, action, entity, entity_id, detail, ip_address)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      input.userId ?? null,
      input.action,
      input.entity ?? null,
      input.entityId ?? null,
      input.detail ? JSON.stringify(input.detail) : null,
      input.ip ?? null
    ]
  })
}
