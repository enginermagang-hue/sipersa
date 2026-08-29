import { useDb } from '../../utils/db'
import { normalizePhone } from '../../utils/fonnte'
import { logActivity } from '../../utils/logger'

export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({})) as any
  const sender = String(body.sender || body.number || body.phone || '').trim()
  const message = String(body.message || body.text || '').trim()
  const raw = JSON.stringify(body).slice(0, 2000)

  const db = useDb()
  if (sender && message) {
    await db.execute({ sql: `INSERT INTO wa_inbound (sender, message, raw) VALUES (?,?,?)`, args: [sender, message, raw] })
  }

  const m = message.match(/^(SELESAI|PROSES|TOLAK)\s+(\d+)\s*(.*)$/i)
  if (!m) return { ok: true, ignored: true }

  const [, cmd, idStr, catatan] = m
  const disposisiId = Number(idStr)
  const normSender = normalizePhone(sender)
  if (!normSender) return { ok: false, error: 'sender invalid' }

  // find user by no_hp normalized comparison
  const users = await db.execute(`SELECT id, no_hp FROM users WHERE no_hp IS NOT NULL`)
  let userId: number | null = null
  for (const u of users.rows as any[]) {
    if (normalizePhone(u.no_hp) === normSender) { userId = u.id; break }
  }
  if (!userId) return { ok: false, error: 'user not found for sender' }

  const dRes = await db.execute({ sql: `SELECT * FROM disposisi WHERE id=? AND kepada_user_id=?`, args: [disposisiId, userId] })
  const disp = (dRes.rows[0] as any)
  if (!disp) return { ok: false, error: 'disposisi not found or not yours' }

  const now = new Date().toISOString()
  if (cmd.toUpperCase() === 'PROSES') {
    await db.execute({ sql: `UPDATE disposisi SET status='diproses', diproses_at=? WHERE id=?`, args: [now, disposisiId] })
  } else if (cmd.toUpperCase() === 'SELESAI') {
    await db.execute({ sql: `UPDATE disposisi SET status='selesai', selesai_at=?, catatan=? WHERE id=?`, args: [now, catatan || disp.catatan, disposisiId] })
  }
  await logActivity({ userId, action: `wa:${cmd.toLowerCase()}`, entity: 'disposisi', entityId: disposisiId, detail: catatan, ip: getHeader(event, 'x-forwarded-for') || '' })

  // reply confirmation via fonnte (fire-and-forget)
  const { sendViaFonnte } = await import('../../utils/fonnte')
  await sendViaFonnte(normSender, `✅ Disposisi #${disposisiId} ditandai ${cmd.toUpperCase()} via WhatsApp.`).catch(() => {})

  return { ok: true, disposisiId, status: cmd.toUpperCase() }
})
