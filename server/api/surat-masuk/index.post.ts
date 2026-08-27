import { useDb } from '../../utils/db'
import { readFormWithFile, toIntOrNull } from '../../utils/body'
import { DROPBOX_FOLDERS, uploadToDrive } from '../../utils/dropbox'
import { generateNo } from '../../utils/no'
import { suratMasukSchema } from '../../../lib/validations'
import { logActivity } from '../../utils/logger'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  const { fields, file } = await readFormWithFile(event)

  const parsed = suratMasukSchema.safeParse({
    tgl_surat: fields.tgl_surat,
    tgl_terima: fields.tgl_terima,
    pengirim: fields.pengirim,
    perihal: fields.perihal,
    sifat: fields.sifat,
    klasifikasi_id: toIntOrNull(fields.klasifikasi_id),
    no_agenda: fields.no_agenda || null
  })
  if (!parsed.success) {
    throw createError({ statusCode: 422, statusMessage: 'Data tidak valid', data: parsed.error.issues })
  }
  const data = parsed.data

  const year = new Date(data.tgl_surat).getFullYear()
  const { no_urut, no_surat } = await generateNo('surat_masuk', 'SM-INST', year)

  let fileDriveId: string | null = null
  let fileName: string | null = null
  if (file) {
    const up = await uploadToDrive(`${no_surat}_${file.filename}`, file.type, file.data, DROPBOX_FOLDERS.SM)
    fileDriveId = up.id as string
    fileName = file.filename
  }

  const db = useDb()
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
