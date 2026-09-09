import { useDb } from '../../utils/db'
import { assertFilesSize, readFormWithFiles, toIntOrNull } from '../../utils/body'
import { DROPBOX_FOLDERS, uploadToDrive } from '../../utils/dropbox'
import { generateNo } from '../../utils/no'
import { suratMasukSchema } from '../../../lib/validations'
import { logActivity } from '../../utils/logger'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  if (auth.role !== 'staff') {
    throw createError({ statusCode: 403, statusMessage: 'Tidak diizinkan membuat Surat Masuk — hanya Staff' })
  }
  const { fields, files } = await readFormWithFiles(event)

  const parsed = suratMasukSchema.safeParse({
    tgl_surat: fields.tgl_surat,
    tgl_terima: fields.tgl_terima,
    pengirim: fields.pengirim,
    perihal: fields.perihal,
    sifat: fields.sifat,
    klasifikasi_id: toIntOrNull(fields.klasifikasi_id),
    no_agenda: fields.no_agenda || null,
    no_surat: fields.no_surat ? String(fields.no_surat).trim() || null : null
  })
  if (!parsed.success) {
    throw createError({ statusCode: 422, statusMessage: 'Data tidak valid', data: parsed.error.issues })
  }
  const data = parsed.data

  const db = useDb()
  const year = new Date(data.tgl_surat).getFullYear()
  let no_urut: number
  let no_surat: string
  const manualNo = data.no_surat ? String(data.no_surat).trim() : ''
  if (manualNo) {
    const dup = await db.execute({ sql: `SELECT id FROM surat_masuk WHERE LOWER(TRIM(no_surat)) = ? AND deleted_at IS NULL LIMIT 1`, args: [manualNo.toLowerCase()] })
    if (dup.rows.length > 0) throw createError({ statusCode: 409, statusMessage: 'No. Surat sudah dipakai' })
    const maxRes = await db.execute({ sql: `SELECT MAX(no_urut) as m FROM surat_masuk WHERE no_surat LIKE ?`, args: [`%/${year}`] })
    const max = (maxRes.rows[0] as any).m as number | null
    no_urut = (max ?? 0) + 1
    no_surat = manualNo
  } else {
    const gen = await generateNo('surat_masuk', 'SM-INST', year)
    no_urut = gen.no_urut
    no_surat = gen.no_surat
  }

  assertFilesSize(files)
  // upload multiple (bebas jumlah, total 25MB)
  const uploaded: { id: string, name: string, type: string, size: number }[] = []
  for (const f of files) {
    const up = await uploadToDrive(`${no_surat}_${f.filename}`, f.type, f.data, DROPBOX_FOLDERS.SM)
    uploaded.push({ id: up.id as string, name: f.filename, type: f.type, size: f.data.length })
  }
  const fileDriveId = uploaded[0]?.id || null
  const fileName = uploaded[0]?.name || null

  const res = await db.execute({
    sql: `INSERT INTO surat_masuk
      (no_agenda, no_urut, no_surat, klasifikasi_id, tgl_surat, tgl_terima, pengirim, perihal, sifat, file_drive_id, file_name, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      data.no_agenda ?? null,
      no_urut,
      no_surat,
      toIntOrNull(fields.klasifikasi_id),
      data.tgl_surat,
      data.tgl_terima,
      data.pengirim,
      data.perihal,
      data.sifat,
      fileDriveId,
      fileName,
      auth.userId
    ]
  })

  const id = Number((res.rows[0] as any)?.id ?? res.lastInsertRowid)
  if (uploaded.length) {
    for (const u of uploaded) {
      await db.execute({ sql: `INSERT INTO surat_files (surat_masuk_id, file_drive_id, file_name, mime_type, size) VALUES (?, ?, ?, ?, ?)`, args: [id, u.id, u.name, u.type, u.size] })
    }
  }
  try {
    const pims = await db.execute({ sql: `SELECT id FROM users WHERE role = 'pimpinan' AND deleted_at IS NULL` })
    const perihalShort = data.perihal.length > 120 ? `${data.perihal.slice(0, 120)}…` : data.perihal
    const msg = `${no_surat} — ${data.pengirim}: ${perihalShort}`
    for (const r of pims.rows as any[]) {
      await db.execute({ sql: `INSERT INTO notifications (user_id, title, message, entity, entity_id) VALUES (?, ?, ?, 'surat_masuk', ?)`, args: [r.id, 'Surat Masuk Baru', msg, id] })
    }

    // WhatsApp Fonnte — otomatis ke semua pimpinan aktif yang punya no_hp
    try {
      const { queueWa, processOutboxBatch } = await import('../../utils/fonnte')
      const config = useRuntimeConfig() as any
      const appUrl = (config.appUrl || '').trim().replace(/\/$/, '') || getHeader(event, 'origin') || ''
      const waPims = await db.execute({
        sql: `SELECT id, nama, no_hp FROM users WHERE role='pimpinan' AND deleted_at IS NULL AND status='active' AND no_hp IS NOT NULL AND TRIM(no_hp) != ''`
      })
      for (const u of waPims.rows as any[]) {
        const waMsg = `*SIPERSA — Surat Masuk Baru* \n\nNo Surat : ${no_surat}\nPengirim : ${data.pengirim}\nPerihal  : ${data.perihal}\nSifat    : ${data.sifat}\n\nBuka: ${appUrl}/surat-masuk/${id}`
        await queueWa(u.no_hp, u.id, waMsg, 'surat_masuk', id)
      }
      if (waPims.rows.length > 0) setImmediate(() => processOutboxBatch().catch(() => {}))
    } catch {}
  } catch {}
  await logActivity({
    userId: auth.userId,
    action: 'CREATE_SURAT_MASUK',
    entity: 'surat_masuk',
    entityId: id,
    detail: { no_surat },
    ip: getRequestIP(event, { xForwardedFor: true })
  })

  return { id, no_surat }
})
