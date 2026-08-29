import { sendViaFonnte } from '../../utils/fonnte'
export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  if (auth.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Hanya admin' })
  const body = await readBody(event) as any
  const to = String(body.to || '').trim()
  const message = String(body.message || 'Test SIPERSA WhatsApp via Fonnte ✅').trim()
  if (!to) throw createError({ statusCode: 422, statusMessage: 'to wajib diisi' })
  const r = await sendViaFonnte(to, message)
  if (!r.ok) throw createError({ statusCode: 502, statusMessage: r.error || 'Gagal kirim' })
  return { ok: true, raw: r.raw }
})
