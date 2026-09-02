import { useDb } from '../../utils/db'
import { assertFileSize, readFormWithFile } from '../../utils/body'
import { DROPBOX_FOLDERS, uploadToDrive } from '../../utils/dropbox'
import { logActivity } from '../../utils/logger'
import { notifyPimpinanSuratKeluar } from '../../utils/notify'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  const id = Number(event.context.params?.id)
  const db = useDb()
  const exist = await db.execute({ sql: 'SELECT * FROM surat_keluar WHERE id = ? AND deleted_at IS NULL', args: [id] })
  if (exist.rows.length === 0) throw createError({ statusCode: 404, statusMessage: 'Surat tidak ditemukan' })

  const surat = exist.rows[0] as any
  if (surat.status === 'draft' && auth.role !== 'admin' && surat.created_by !== auth.userId) {
    throw createError({ statusCode: 403, statusMessage: 'Hanya pembuat atau admin yang dapat mengedit draft' })
  }

  const { fields, file } = await readFormWithFile(event)
  let fileDriveId: string | null = (exist.rows[0] as any).file_drive_id
  let fileName: string | null = (exist.rows[0] as any).file_name
  assertFileSize(file)
  if (file) {
    const up = await uploadToDrive(`${(exist.rows[0] as any).no_surat}_${file.filename}`, file.type, file.data, DROPBOX_FOLDERS.SK)
    fileDriveId = up.id as string
    fileName = file.filename
  }

  const kode = (fields.klasifikasi_kode ?? fields.klasifikasi_id ?? (exist.rows[0] as any).klasifikasi_kode ?? '').toString().trim()
  if (!kode) throw createError({ statusCode: 422, statusMessage: 'Kode klasifikasi wajib diisi' })

  await db.execute({
    sql: `UPDATE surat_keluar SET tgl_surat = ?, tujuan = ?, perihal = ?, sifat = ?, klasifikasi_kode = ?, status = ?, penandatangan = ?, penandatangan_id = ?, html_content = ?, render_config = ?, file_drive_id = ?, file_name = ? WHERE id = ?`,
    args: [ fields.tgl_surat, fields.tujuan, fields.perihal, fields.sifat || 'biasa', kode, fields.status || 'draft', fields.penandatangan || '', fields.penandatangan_id ? Number(fields.penandatangan_id) : null, fields.html_content || null, fields.render_config || null, fileDriveId, fileName, id ]
  })
  if (surat.status !== 'menunggu_persetujuan' && (fields.status === 'menunggu_persetujuan')) {
    await notifyPimpinanSuratKeluar(db, { id, no_surat: (surat as any).no_surat, tujuan: fields.tujuan as string, perihal: fields.perihal as string })
  }
  await logActivity({ userId: auth.userId, action: 'UPDATE_SURAT_KELUAR', entity: 'surat_keluar', entityId: id, ip: getRequestIP(event, { xForwardedFor: true }) })
  return { ok: true }
})
