export async function notifyPimpinanSuratKeluar(db: any, surat: { id: number; no_surat: string; tujuan: string; perihal: string }) {
  try {
    const pims = await db.execute({ sql: `SELECT id FROM users WHERE role = 'pimpinan' AND deleted_at IS NULL` })
    const perihalShort = surat.perihal.length > 120 ? `${surat.perihal.slice(0, 120)}…` : surat.perihal
    const msg = `${surat.no_surat} — ${surat.tujuan}: ${perihalShort}`
    for (const r of pims.rows as any[]) {
      const dup = await db.execute({
        sql: `SELECT 1 FROM notifications WHERE entity='surat_keluar' AND entity_id=? AND user_id=? AND title='Surat Keluar Butuh Persetujuan' AND created_at > datetime('now','-1 minute') LIMIT 1`,
        args: [surat.id, r.id]
      })
      if (dup.rows.length) continue
      await db.execute({ sql: `INSERT INTO notifications (user_id, title, message, entity, entity_id) VALUES (?, ?, ?, 'surat_keluar', ?)`, args: [r.id, 'Surat Keluar Butuh Persetujuan', msg, surat.id] })
    }
  } catch {}
}
