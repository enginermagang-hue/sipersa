import { useDb } from '../../utils/db'
import { readFormWithFile } from '../../utils/body'
import { DROPBOX_FOLDERS, uploadToDrive } from '../../utils/dropbox'
import { logActivity } from '../../utils/logger'

const MAX_TTD_SIZE = 2 * 1024 * 1024

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  if (auth.role !== 'pimpinan') {
    throw createError({ statusCode: 403, statusMessage: 'Hanya pimpinan yang dapat mengunggah tanda tangan' })
  }

  const { file } = await readFormWithFile(event)
  if (!file) throw createError({ statusCode: 422, statusMessage: 'File tanda tangan wajib diunggah' })
  if (!file.type.startsWith('image/')) throw createError({ statusCode: 422, statusMessage: 'File harus berupa gambar (PNG/JPG)' })
  if (file.data.length > MAX_TTD_SIZE) throw createError({ statusCode: 422, statusMessage: 'Ukuran gambar maksimal 2 MB' })

  const up = await uploadToDrive(`ttd_${auth.username}_${file.filename}`, file.type, file.data, DROPBOX_FOLDERS.TT)

  const db = useDb()
  await db.execute({
    sql: 'UPDATE users SET ttd_file_drive_id = ?, ttd_file_name = ? WHERE id = ?',
    args: [up.id as string, file.filename, auth.userId]
  })
  await logActivity({ userId: auth.userId, action: 'UPLOAD_TTD', entity: 'users', entityId: auth.userId, ip: getRequestIP(event, { xForwardedFor: true }) })

  return { ok: true, file_name: file.filename }
})
