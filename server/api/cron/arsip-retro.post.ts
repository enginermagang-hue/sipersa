import { useDb } from '../../utils/db'
import { autoArsipFromMasuk, autoArsipFromKeluar } from '../../utils/arsip-auto'
import { logActivity } from '../../utils/logger'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  const authHeader = getHeader(event, 'authorization') || ''
  const cronSecretHeader = getHeader(event, 'x-cron-secret') || ''
  const expected = process.env.CRON_SECRET || process.env.NUXT_CRON_SECRET || (useRuntimeConfig() as any).cronSecret || (useRuntimeConfig() as any).cron_secret
  const isCron = !!expected && (authHeader === `Bearer ${expected}` || cronSecretHeader === expected)
  if (!isCron) {
    if (!auth || auth.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Hanya admin' })
  }

  const db = useDb()
  let masukSelesai = 0
  let masukTanpaDisposisi = 0
  let keluarTerkirim = 0

  // A: surat_masuk selesai belum diarsip
  const qA = await db.execute({
    sql: `SELECT sm.id FROM surat_masuk sm LEFT JOIN arsip a ON a.ref_masuk_id = sm.id AND a.deleted_at IS NULL WHERE sm.status='selesai' AND sm.deleted_at IS NULL AND a.id IS NULL`
  })
  for (const r of qA.rows as any[]) {
    try { const id = await autoArsipFromMasuk(db, r.id); if (id) masukSelesai++ } catch {}
  }

  // B: tanpa disposisi >7 hari
  const qB = await db.execute({
    sql: `SELECT sm.id FROM surat_masuk sm WHERE sm.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM disposisi d WHERE d.surat_masuk_id=sm.id AND d.deleted_at IS NULL) AND NOT EXISTS (SELECT 1 FROM arsip a WHERE a.ref_masuk_id=sm.id AND a.deleted_at IS NULL) AND sm.created_at < datetime('now','-7 days')`
  })
  for (const r of qB.rows as any[]) {
    try { const id = await autoArsipFromMasuk(db, r.id); if (id) masukTanpaDisposisi++ } catch {}
  }

  // C: surat_keluar terkirim belum diarsip
  const qC = await db.execute({
    sql: `SELECT sk.id FROM surat_keluar sk LEFT JOIN arsip a ON a.ref_keluar_id=sk.id AND a.deleted_at IS NULL WHERE sk.status='terkirim' AND sk.deleted_at IS NULL AND a.id IS NULL`
  })
  for (const r of qC.rows as any[]) {
    try { const id = await autoArsipFromKeluar(db, r.id); if (id) keluarTerkirim++ } catch {}
  }

  try {
    await logActivity({ userId: auth?.userId ?? null, action: 'CRON_ARSIP_RETRO', entity: 'arsip', entityId: null as any, detail: { masukSelesai, masukTanpaDisposisi, keluarTerkirim } as any, ip: getRequestIP(event, { xForwardedFor: true }) })
  } catch {}

  return { ok: true, created: { masukSelesai, masukTanpaDisposisi, keluarTerkirim } }
})
