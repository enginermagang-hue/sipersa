import { getQuery } from 'h3'
import { useDb } from '../utils/db'

export default defineEventHandler(async (event) => {
  const q = ((getQuery(event).q as string) || '').trim()
  if (q.length < 2) return { surat_masuk: [], surat_keluar: [], arsip: [] }
  const like = `%${q}%`
  const db = useDb()

  const masuk = await db.execute({
    sql: `SELECT id, no_surat, perihal, pengirim, tgl_surat FROM surat_masuk
          WHERE deleted_at IS NULL AND (no_surat LIKE ? OR perihal LIKE ? OR pengirim LIKE ?)
          ORDER BY created_at DESC LIMIT 15`,
    args: [like, like, like]
  })
  const keluar = await db.execute({
    sql: `SELECT id, no_surat, perihal, tujuan, tgl_surat FROM surat_keluar
          WHERE deleted_at IS NULL AND (no_surat LIKE ? OR perihal LIKE ? OR tujuan LIKE ?)
          ORDER BY created_at DESC LIMIT 15`,
    args: [like, like, like]
  })
  const arsip = await db.execute({
    sql: `SELECT id, nama_dokumen, lokasi, tahun FROM arsip
          WHERE deleted_at IS NULL AND (nama_dokumen LIKE ? OR lokasi LIKE ?)
          ORDER BY tahun DESC LIMIT 15`,
    args: [like, like]
  })

  return {
    surat_masuk: masuk.rows,
    surat_keluar: keluar.rows,
    arsip: arsip.rows
  }
})
