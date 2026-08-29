import { useDb } from './db'

export function normalizePhone(raw: string): string | null {
  if (!raw) return null
  let s = raw.trim().replace(/[\s\-()]/g, '')
  if (s.startsWith('+')) s = s.slice(1)
  if (s.startsWith('0')) s = '62' + s.slice(1)
  else if (s.startsWith('8')) s = '62' + s
  if (!/^62\d{9,13}$/.test(s)) return null
  return s
}

export function buildDisposisiMessage(p: {
  namaPenerima: string
  noSurat: string
  perihal: string
  pengirim: string
  sifat: string
  prioritas: string
  instruksi: string
  batasWaktu?: string | null
  namaPengirim: string
  disposisiId: number
  appUrl: string
}) {
  return `*SIPERSA — Disposisi Baru* \n\nYth. ${p.namaPenerima},\nAnda menerima disposisi:\n\nNo Surat : ${p.noSurat}\nPerihal  : ${p.perihal}\nPengirim : ${p.pengirim}\nSifat    : ${p.sifat} (${p.prioritas})\nInstruksi: ${p.instruksi}\nBatas    : ${p.batasWaktu || '-'}\nDari     : ${p.namaPengirim}\n\nBuka: ${p.appUrl}/disposisi/${p.disposisiId}\n\nBalas: SELESAI ${p.disposisiId} <catatan> atau PROSES ${p.disposisiId}`
}

export async function sendViaFonnte(to: string, message: string): Promise<{ ok: boolean; error?: string; raw?: string }> {
  const config = useRuntimeConfig() as any
  const token = ((config.fonnteToken || (process.env as any).NUXT_FONTE_TOKEN || (process.env as any).NUXT_FONNTE_TOKEN) || '').trim()
  const rawEnabled = (config as any).fonnteEnabled ?? (process.env as any).NUXT_FONTE_ENABLED ?? (process.env as any).NUXT_FONNTE_ENABLED
  const enabled = rawEnabled === true || String(rawEnabled).toLowerCase() === 'true' || !!token
  if (!token) return { ok: false, error: 'Fonnte token belum dikonfigurasi' }
  if (!enabled) return { ok: false, error: 'Fonnte disabled' }
  const baseUrl = (config.fonnteBaseUrl || 'https://api.fonnte.com/send').trim()
  const normalized = normalizePhone(to)
  if (!normalized) return { ok: false, error: 'Nomor HP tidak valid' }

  const body = new URLSearchParams({ target: normalized, message, countryCode: '62' })
  const res = await fetch(baseUrl, {
    method: 'POST',
    headers: { Authorization: token },
    body
  })
  const text = await res.text()
  let json: any = null
  try { json = JSON.parse(text) } catch {}
  const ok = res.ok && (json?.status === true || json?.status == 'true' || res.ok)
  // Fonnte returns status:false on error
  if (json && json.status === false) return { ok: false, error: json.reason || text.slice(0, 300), raw: text.slice(0, 500) }
  if (!res.ok) return { ok: false, error: text.slice(0, 300), raw: text.slice(0, 500) }
  return { ok: true, raw: text.slice(0, 500) }
}

export async function queueWa(toPhone: string, targetUserId: number | null, message: string, entity: string, entityId: number) {
  const db = useDb()
  const norm = normalizePhone(toPhone)
  if (!norm) return
  await db.execute({
    sql: `INSERT INTO wa_outbox (to_phone, target_user_id, message, entity, entity_id, status) VALUES (?,?,?,?,?,'pending')`,
    args: [norm, targetUserId, message, entity, entityId]
  })
}

export async function processOutboxBatch(limit = 5) {
  const db = useDb()
  const res = await db.execute({ sql: `SELECT * FROM wa_outbox WHERE status='pending' AND attempts < 3 ORDER BY id ASC LIMIT ?`, args: [limit] })
  for (const row of res.rows as any[]) {
    await db.execute({ sql: `UPDATE wa_outbox SET attempts=attempts+1 WHERE id=?`, args: [row.id] })
    const r = await sendViaFonnte(row.to_phone, row.message)
    if (r.ok) {
      await db.execute({ sql: `UPDATE wa_outbox SET status='sent', sent_at=datetime('now'), fonnte_response=? WHERE id=?`, args: [r.raw || '', row.id] })
    } else {
      const failed = row.attempts + 1 >= 3
      await db.execute({ sql: `UPDATE wa_outbox SET status=?, last_error=?, fonnte_response=? WHERE id=?`, args: [failed ? 'failed' : 'pending', r.error || '', r.raw || '', row.id] })
    }
    // delay 1s to respect rate limit
    await new Promise(r => setTimeout(r, 1000))
  }
}
