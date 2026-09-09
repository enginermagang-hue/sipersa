import { useDb } from '../../utils/db'
import { assertFilesSize, readFormWithFiles, toIntOrNull } from '../../utils/body'
import { DROPBOX_FOLDERS, uploadToDrive } from '../../utils/dropbox'
import { arsipSchema } from '../../../lib/validations'
import { logActivity } from '../../utils/logger'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  if (!['admin', 'staff'].includes(auth.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Tidak diizinkan membuat Arsip — hanya Admin & Staff' })
  }
  const { fields, files } = await readFormWithFiles(event)

  const parsed = arsipSchema.safeParse({
    nama_dokumen: fields.nama_dokumen,
    lokasi: fields.lokasi,
    tahun: toIntOrNull(fields.tahun),
    klasifikasi_id: toIntOrNull(fields.klasifikasi_id),
    ref_masuk_id: toIntOrNull(fields.ref_masuk_id),
    ref_keluar_id: toIntOrNull(fields.ref_keluar_id)
  })
  if (!parsed.success) {
    throw createError({ statusCode: 422, statusMessage: 'Data tidak valid', data: parsed.error.issues })
  }
  const data = parsed.data

  const db = useDb()
  if (data.ref_masuk_id) {
    const dup = await db.execute({
      sql: 'SELECT id FROM arsip WHERE deleted_at IS NULL AND ref_masuk_id = ? LIMIT 1',
      args: [data.ref_masuk_id]
    })
    if (dup.rows.length > 0) {
      throw createError({ statusCode: 409, statusMessage: 'Surat ini sudah diarsipkan' })
    }
  }
  if (data.ref_keluar_id) {
    const dup = await db.execute({
      sql: 'SELECT id FROM arsip WHERE deleted_at IS NULL AND ref_keluar_id = ? LIMIT 1',
      args: [data.ref_keluar_id]
    })
    if (dup.rows.length > 0) {
      throw createError({ statusCode: 409, statusMessage: 'Surat ini sudah diarsipkan' })
    }
  }

  assertFilesSize(files)
  const uploaded: { id: string, name: string, type: string, size: number }[] = []
  for (const f of files) {
    const up = await uploadToDrive(`${data.nama_dokumen}_${f.filename}`, f.type, f.data, DROPBOX_FOLDERS.ARSIP)
    uploaded.push({ id: up.id as string, name: f.filename, type: f.type, size: f.data.length })
  }
  let fileDriveId = uploaded[0]?.id || fields.file_drive_id || null
  let fileName = uploaded[0]?.name || fields.file_name || null

  const res = await db.execute({
    sql: `INSERT INTO arsip (ref_masuk_id, ref_keluar_id, klasifikasi_id, nama_dokumen, lokasi, tahun, file_drive_id, file_name, tgl_arsip)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    args: [
      data.ref_masuk_id ?? null,
      data.ref_keluar_id ?? null,
      data.klasifikasi_id ?? null,
      data.nama_dokumen,
      data.lokasi || null,
      data.tahun ?? null,
      fileDriveId,
      fileName
    ]
  })
  const arsipId = Number(res.lastInsertRowid)
  for (const u of uploaded) {
    await db.execute({ sql: `INSERT INTO arsip_files (arsip_id, file_drive_id, file_name, mime_type, size) VALUES (?, ?, ?, ?, ?)`, args: [arsipId, u.id, u.name, u.type, u.size] })
  }
  await logActivity({
    userId: auth.userId,
    action: 'CREATE_ARSIP',
    entity: 'arsip',
    entityId: arsipId,
    detail: data.ref_masuk_id ? { ref_masuk_id: data.ref_masuk_id } : data.ref_keluar_id ? { ref_keluar_id: data.ref_keluar_id } : null,
    ip: getRequestIP(event, { xForwardedFor: true })
  })
  return { id: arsipId }
})
