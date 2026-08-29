import { useDb } from '../../../utils/db'
import { getDriveFile } from '../../../utils/dropbox'
export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  if (auth.role !== 'pimpinan' && auth.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Hanya pimpinan' })
  const id = Number(event.context.params?.id)
  const db = useDb()
  const res = await db.execute({ sql: 'SELECT penandatangan_id FROM surat_keluar WHERE id=? AND deleted_at IS NULL', args: [id] })
  if (!res.rows.length) throw createError({ statusCode: 404, statusMessage: 'Surat tidak ditemukan' })
  const penId = (res.rows[0] as any).penandatangan_id as number|null
  async function tryFetch(uid:number){
    const r=await db.execute({sql:'SELECT ttd_file_drive_id, ttd_file_name FROM users WHERE id=?',args:[uid]})
    const row=(r.rows[0] as any); if(!row?.ttd_file_drive_id) return null
    return await getDriveFile(row.ttd_file_drive_id, row.ttd_file_name)
  }
  let d = penId ? await tryFetch(penId).catch(()=>null) : null
  if(!d) d = await tryFetch(auth.userId).catch(()=>null)
  if(!d) throw createError({ statusCode: 404, statusMessage: 'Tanda tangan belum diunggah' })
  setHeader(event,'Content-Type', (d.headers['content-type'] as string)||'image/png')
  setHeader(event,'Cache-Control','no-store')
  return d.data
})
