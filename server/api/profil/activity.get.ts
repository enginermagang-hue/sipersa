import { useDb } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  const db = useDb()
  const userId = auth.userId

  const totalKeluar = await db.execute({
    sql: `SELECT COUNT(*) as c FROM surat_keluar WHERE created_by = ? AND deleted_at IS NULL`,
    args: [userId]
  })
  const totalKeluarCount = Number((totalKeluar.rows[0] as any).c) || 0

  const terarsip = await db.execute({
    sql: `SELECT COUNT(*) as c FROM arsip WHERE ref_keluar_id IN (SELECT id FROM surat_keluar WHERE created_by = ? AND deleted_at IS NULL) AND deleted_at IS NULL`,
    args: [userId]
  })
  const terarsipCount = Number((terarsip.rows[0] as any).c) || 0

  const belumDiarsipkan = Math.max(0, totalKeluarCount - terarsipCount)
  const progress = totalKeluarCount > 0 ? Math.round((terarsipCount / totalKeluarCount) * 100) : 0

  const logs = await db.execute({
    sql: `SELECT id, action, entity, entity_id, detail, created_at FROM activity_log WHERE user_id = ? ORDER BY created_at DESC LIMIT 5`,
    args: [userId]
  })
  const logsRows = logs.rows as any[]

  const formattedLogs = logsRows.map((row) => {
    let label = row.action || ''
    let ref = ''
    if (row.detail) {
      const match = String(row.detail).match(/(\d+\/\d+)/)
      if (match) ref = match[1]
    }
    if (!ref && row.entity && row.entity_id) ref = String(row.entity_id)
    return {
      id: row.id,
      label,
      ref,
      createdAt: row.created_at,
      entityId: row.entity_id
    }
  })

  return {
    stats: {
      totalKeluar: totalKeluarCount,
      terarsip: terarsipCount,
      belumDiarsipkan,
      progress
    },
    activities: formattedLogs
  }
})
