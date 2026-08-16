import { useDb } from '../../utils/db'
import { readFormWithFile, toIntOrNull } from '../../utils/body'
import { DROPBOX_FOLDERS, uploadToDrive } from '../../utils/dropbox'
import { generateNo } from '../../utils/no'
import { suratKeluarSchema } from '../../../lib/validations'
import { logActivity } from '../../utils/logger'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  const { fields, file } = await readFormWithFile(event)

  const parsed = suratKeluarSchema.safeParse({
    tgl_surat: fields.tgl_surat,
    tujuan: fields.tujuan,
    perihal: fields.perihal,
    sifat: fields.sifat,
    klasifikasi_id: toIntOrNull(fields.klasifikasi_id)
  })
  if (!parsed.success) {
    throw createError({ statusCode: 422, statusMessage: 'Data tidak valid', data: parsed.error.issues })
  }
  const data = parsed.data

  const year = new Date(data.tgl_surat).getFullYear()
  const { no_urut, no_surat } = await generateNo('surat_keluar', 'SK-INST', year)

  let fileDriveId: string | null = null
  let fileName: string | null = null
  if (file) {
    const up = await uploadToDrive(`${no_surat}_${file.filename}`, file.type, file.data, DROPBOX_FOLDERS.SK)
    fileDriveId = up.id as string
    fileName = file.filename
  }

  const db = useDb()
  const res = await db.execute({
    sql: `INSERT INTO surat_keluar (no_urut, no_surat, klasifikasi_id, tgl_surat, tujuan, perihal, sifat, file_drive_id, file_name, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      no_urut, no_surat, data.klasifikasi_id ?? null, data.tgl_surat, data.tujuan,
      data.perihal, data.sifat, fileDriveId, fileName, auth.userId
    ]
  })
  const id = Number((res.rows[0] as any)?.id ?? res.lastInsertRowid)
  await logActivity({ userId: auth.userId, action: 'CREATE_SURAT_KELUAR', entity: 'surat_keluar', entityId: id, detail: { no_surat }, ip: getRequestIP(event, { xForwardedFor: true }) })
  return { id, no_surat }
})
