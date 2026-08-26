import { useDb } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const id = Number(event.context.params?.id)
  const db = useDb()
  const res = await db.execute({
    sql: `SELECT sm.*, k.kode as klasifikasi_kode, k.nama as klasifikasi_nama
          FROM surat_masuk sm
          LEFT JOIN klasifikasi k ON k.id = sm.klasifikasi_id
          WHERE sm.id = ? AND sm.deleted_at IS NULL`,
    args: [id]
  })
  if (res.rows.length === 0) {
    throw createError({ statusCode: 404, statusMessage: 'Surat tidak ditemukan' })
  }
  const surat = res.rows[0] as any
  const needsRingkasan = !surat.ringkasan &&
    typeof surat.file_drive_id === 'string' &&
    surat.file_drive_id.length > 0

  const disp = await db.execute({
    sql: `SELECT d.*, u.nama as kepada_nama, u2.nama as dari_nama
          FROM disposisi d
          JOIN users u ON u.id = d.kepada_user_id
          JOIN users u2 ON u2.id = d.dari_user_id
          WHERE d.surat_masuk_id = ? AND d.deleted_at IS NULL
          ORDER BY d.created_at ASC`,
    args: [id]
  })

  const ars = await db.execute({
    sql: `SELECT id, nama_dokumen, lokasi, tahun FROM arsip
          WHERE ref_masuk_id = ? AND deleted_at IS NULL LIMIT 1`,
    args: [id]
  })

  const payload = { surat, disposisi: disp.rows, arsip: ars.rows[0] || null }

  if (needsRingkasan) {
    const fileDriveId = surat.file_drive_id as string
    const fileName = surat.file_name || 'file.pdf'
    void (async () => {
      try {
        console.log(`[ringkasan] mulai ekstrak surat id=${id} file=${fileName}`)
        const { getDriveFile } = await import('../../utils/dropbox')
        const { extractPdfText } = await import('../../utils/pdf-extract')
        const driveRes = await getDriveFile(fileDriveId, fileName)
        const text = await extractPdfText(driveRes.data as Buffer)
        if (text) {
          await db.execute({ sql: 'UPDATE surat_masuk SET ringkasan = ? WHERE id = ?', args: [text, id] })
          console.log(`[ringkasan] sukses surat id=${id}, panjang=${text.length}`)
        } else {
          console.warn(`[ringkasan] teks kosong surat id=${id}`)
        }
      } catch (e: any) {
        console.error(`[ringkasan] gagal surat id=${id}:`, e?.message || e)
      }
    })()
  }

  return payload
})
