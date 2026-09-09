import { useDb } from '../../utils/db'
import { assertFilesSize, readFormWithFiles } from '../../utils/body'
import { DROPBOX_FOLDERS, uploadToDrive } from '../../utils/dropbox'
import { generateNoSuratKeluar } from '../../utils/no'
import { suratKeluarSchema } from '../../../lib/validations'
import { logActivity } from '../../utils/logger'
import { notifyPimpinanSuratKeluar } from '../../utils/notify'
import { convertHeicFilesIfNeeded } from '../../utils/heic'
import { straightenImageFiles } from '../../utils/docscan'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  if (auth.role !== 'staff') throw createError({ statusCode: 403, statusMessage: 'Hanya staff yang dapat membuat surat keluar' })
  let { fields, files } = await readFormWithFiles(event)
  files = await convertHeicFilesIfNeeded(files as any) as any
  files = await straightenImageFiles(files as any) as any
  const rawKode = (fields.klasifikasi_kode ?? fields.klasifikasi_id ?? '').toString().trim()

  const parsed = suratKeluarSchema.safeParse({
    tgl_surat: fields.tgl_surat,
    tujuan: fields.tujuan,
    perihal: fields.perihal,
    sifat: fields.sifat,
    klasifikasi_kode: rawKode,
    status: fields.status || 'draft',
    penandatangan: fields.penandatangan || '',
    penandatangan_id: fields.penandatangan_id ? Number(fields.penandatangan_id) : null,
    html_content: fields.html_content || null,
    render_config: fields.render_config || null,
    no_urut: fields.no_urut ? Number(fields.no_urut) : null,
    no_surat: fields.no_surat || ''
  })
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: 'Data tidak valid', data: parsed.error.issues })
  const data = parsed.data
  const kode = data.klasifikasi_kode.trim()

  let no_urut: number
  let no_surat: string
  if (data.no_surat) {
    no_surat = data.no_surat
    no_urut = data.no_urut ?? 0
  } else {
    const d = new Date(data.tgl_surat.length===10?`${data.tgl_surat}T00:00:00`:data.tgl_surat)
    const year = d.getFullYear()
    const month = d.getMonth()+1
    const config = useRuntimeConfig()
    const tu = (config.public as any).nomorTU || 'TU'
    const unit = (config.public as any).nomorUnit || 'tekkomdik'
    const gen = await generateNoSuratKeluar(kode, year, month, { tu, unit })
    no_urut = gen.no_urut
    no_surat = gen.no_surat
  }

  assertFilesSize(files)
  const uploaded: { id: string, name: string, type: string, size: number }[] = []
  for (const f of files) {
    const up = await uploadToDrive(`${no_surat}_${f.filename}`, f.type, f.data, DROPBOX_FOLDERS.SK)
    uploaded.push({ id: up.id as string, name: f.filename, type: f.type, size: f.data.length })
  }
  const fileDriveId = uploaded[0]?.id || null
  const fileName = uploaded[0]?.name || null

  const db = useDb()
  const res = await db.execute({
    sql: `INSERT INTO surat_keluar (no_urut, no_surat, klasifikasi_kode, tgl_surat, tujuan, perihal, sifat, status, penandatangan, penandatangan_id, html_content, render_config, file_drive_id, file_name, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [ no_urut, no_surat, kode, data.tgl_surat, data.tujuan, data.perihal, data.sifat, data.status, data.penandatangan, (data as any).penandatangan_id || null, data.html_content, data.render_config, fileDriveId, fileName, auth.userId ]
  })
  const id = Number((res.rows[0] as any)?.id ?? res.lastInsertRowid)
  if (uploaded.length) {
    for (const u of uploaded) {
      await db.execute({ sql: `INSERT INTO surat_files (surat_keluar_id, file_drive_id, file_name, mime_type, size) VALUES (?, ?, ?, ?, ?)`, args: [id, u.id, u.name, u.type, u.size] })
    }
  }
  if (data.status === 'menunggu_persetujuan') await notifyPimpinanSuratKeluar(db, { id, no_surat, tujuan: data.tujuan, perihal: data.perihal })
  await logActivity({ userId: auth.userId, action: 'CREATE_SURAT_KELUAR', entity: 'surat_keluar', entityId: id, detail: { no_surat }, ip: getRequestIP(event, { xForwardedFor: true }) })
  return { id, no_surat }
})
