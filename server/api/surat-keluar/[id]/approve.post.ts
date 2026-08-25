import { useDb } from '../../../utils/db'
import { readFormWithFile } from '../../../utils/body'
import { DROPBOX_FOLDERS, uploadToDrive } from '../../../utils/dropbox'
import { suratKeluarApprovalSchema } from '../../../../lib/validations'
import { logActivity } from '../../../utils/logger'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  if (auth.role !== 'pimpinan') {
    throw createError({ statusCode: 403, statusMessage: 'Hanya pimpinan yang dapat menyetujui surat keluar' })
  }

  const id = Number(event.context.params?.id)
  const db = useDb()
  const res = await db.execute({ sql: 'SELECT * FROM surat_keluar WHERE id = ? AND deleted_at IS NULL', args: [id] })
  if (res.rows.length === 0) throw createError({ statusCode: 404, statusMessage: 'Surat tidak ditemukan' })
  const surat = res.rows[0] as any

  if (surat.status !== 'menunggu_persetujuan') {
    throw createError({ statusCode: 400, statusMessage: 'Surat tidak sedang menunggu persetujuan' })
  }

  const { fields, file } = await readFormWithFile(event)
  const parsed = suratKeluarApprovalSchema.safeParse({
    status: fields.status,
    catatan: fields.catatan || ''
  })
  if (!parsed.success) {
    throw createError({ statusCode: 422, statusMessage: 'Data tidak valid', data: parsed.error.issues })
  }
  const { status, catatan } = parsed.data

  let fileDriveId: string | null = surat.file_drive_id
  let fileName: string | null = surat.file_name
  if (status === 'approved' && file) {
    const up = await uploadToDrive(`${surat.no_surat}_${file.filename}`, file.type, file.data, DROPBOX_FOLDERS.SK)
    fileDriveId = up.id as string
    fileName = file.filename
  } else if (status === 'approved' && !file && surat.html_content) {
    throw createError({ statusCode: 400, statusMessage: 'File PDF hasil persetujuan tidak ditemukan. Muat ulang halaman dan coba lagi.' })
  }

  await db.execute({
    sql: `UPDATE surat_keluar SET status = ?, approved_at = datetime('now'), approved_by = ?, catatan_tolak = ?, file_drive_id = ?, file_name = ? WHERE id = ?`,
    args: [status === 'approved' ? 'terkirim' : 'ditolak', auth.userId, status === 'rejected' ? catatan : null, fileDriveId, fileName, id]
  })
  await db.execute({
    sql: `INSERT INTO surat_keluar_approval (surat_keluar_id, reviewed_by, status, catatan) VALUES (?, ?, ?, ?)`,
    args: [id, auth.userId, status, catatan]
  })
  await logActivity({
    userId: auth.userId,
    action: status === 'approved' ? 'APPROVE_SURAT_KELUAR' : 'REJECT_SURAT_KELUAR',
    entity: 'surat_keluar',
    entityId: id,
    detail: { no_surat: surat.no_surat, catatan },
    ip: getRequestIP(event, { xForwardedFor: true })
  })

  return { ok: true, status: status === 'approved' ? 'terkirim' : 'ditolak' }
})
