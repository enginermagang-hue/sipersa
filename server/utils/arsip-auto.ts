import { useDb } from './db'

async function getKlasifikasiIdByKode(db: any, kode?: string | null): Promise<number | null> {
  if (!kode) return null
  const r = await db.execute({ sql: `SELECT id FROM klasifikasi WHERE kode = ? LIMIT 1`, args: [kode] })
  return (r.rows[0] as any)?.id ?? null
}

export async function autoArsipFromMasuk(db: any, suratMasukId: number): Promise<number | null> {
  const dup = await db.execute({ sql: `SELECT id FROM arsip WHERE ref_masuk_id = ? AND deleted_at IS NULL LIMIT 1`, args: [suratMasukId] })
  if (dup.rows.length) return null
  const smRes = await db.execute({ sql: `SELECT * FROM surat_masuk WHERE id = ? AND deleted_at IS NULL LIMIT 1`, args: [suratMasukId] })
  if (!smRes.rows.length) return null
  const sm = smRes.rows[0] as any
  const fileRes = await db.execute({ sql: `SELECT file_drive_id, file_name, mime_type, size FROM surat_files WHERE surat_masuk_id = ? ORDER BY id ASC LIMIT 1`, args: [suratMasukId] })
  let fileDriveId: string | null = (fileRes.rows[0] as any)?.file_drive_id ?? sm.file_drive_id ?? null
  let fileName: string | null = (fileRes.rows[0] as any)?.file_name ?? sm.file_name ?? null
  let mimeType: string | null = (fileRes.rows[0] as any)?.mime_type ?? null
  let size: number | null = (fileRes.rows[0] as any)?.size ?? null
  const tahun = sm.tgl_surat ? new Date(sm.tgl_surat).getFullYear() : (sm.tahun ?? new Date().getFullYear())
  const nama = (sm.perihal || sm.no_surat || `Arsip Surat Masuk #${sm.id}`).toString().trim()
  const klasId = sm.klasifikasi_id ?? null

  const ins = await db.execute({
    sql: `INSERT INTO arsip (ref_masuk_id, ref_keluar_id, klasifikasi_id, nama_dokumen, lokasi, tahun, sifat, file_drive_id, file_name, tgl_arsip)
          VALUES (?, NULL, ?, ?, NULL, ?, ?, ?, ?, datetime('now'))`,
    args: [suratMasukId, klasId, nama, tahun || null, sm.sifat || 'biasa', fileDriveId, fileName]
  })
  const arsipId = Number(ins.lastInsertRowid)
  if (fileDriveId) {
    await db.execute({ sql: `INSERT INTO arsip_files (arsip_id, file_drive_id, file_name, mime_type, size) VALUES (?, ?, ?, ?, ?)`, args: [arsipId, fileDriveId, fileName, mimeType, size] })
  }
  return arsipId
}

export async function autoArsipFromKeluar(db: any, suratKeluarId: number): Promise<number | null> {
  const dup = await db.execute({ sql: `SELECT id FROM arsip WHERE ref_keluar_id = ? AND deleted_at IS NULL LIMIT 1`, args: [suratKeluarId] })
  if (dup.rows.length) return null
  const skRes = await db.execute({ sql: `SELECT * FROM surat_keluar WHERE id = ? AND deleted_at IS NULL LIMIT 1`, args: [suratKeluarId] })
  if (!skRes.rows.length) return null
  const sk = skRes.rows[0] as any
  const fileRes = await db.execute({ sql: `SELECT file_drive_id, file_name, mime_type, size FROM surat_files WHERE surat_keluar_id = ? ORDER BY id ASC LIMIT 1`, args: [suratKeluarId] })
  let fileDriveId: string | null = (fileRes.rows[0] as any)?.file_drive_id ?? sk.file_drive_id ?? null
  let fileName: string | null = (fileRes.rows[0] as any)?.file_name ?? sk.file_name ?? null
  let mimeType: string | null = (fileRes.rows[0] as any)?.mime_type ?? null
  let size: number | null = (fileRes.rows[0] as any)?.size ?? null
  const tahun = sk.tgl_surat ? new Date(sk.tgl_surat).getFullYear() : new Date().getFullYear()
  const nama = (sk.perihal || sk.no_surat || `Arsip Surat Keluar #${sk.id}`).toString().trim()
  let klasId: number | null = sk.klasifikasi_id ?? null
  if (!klasId && sk.klasifikasi_kode) klasId = await getKlasifikasiIdByKode(db, sk.klasifikasi_kode)

  const ins = await db.execute({
    sql: `INSERT INTO arsip (ref_masuk_id, ref_keluar_id, klasifikasi_id, nama_dokumen, lokasi, tahun, sifat, file_drive_id, file_name, tgl_arsip)
          VALUES (NULL, ?, ?, ?, NULL, ?, ?, ?, ?, datetime('now'))`,
    args: [suratKeluarId, klasId, nama, tahun || null, sk.sifat || 'biasa', fileDriveId, fileName]
  })
  const arsipId = Number(ins.lastInsertRowid)
  if (fileDriveId) {
    await db.execute({ sql: `INSERT INTO arsip_files (arsip_id, file_drive_id, file_name, mime_type, size) VALUES (?, ?, ?, ?, ?)`, args: [arsipId, fileDriveId, fileName, mimeType, size] })
  }
  return arsipId
}
