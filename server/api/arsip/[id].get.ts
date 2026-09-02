import { useDb } from '../../utils/db'

const musnahExpr = `CASE WHEN COALESCE(k.retensi_tahun, 0) = 0 THEN NULL
                    ELSE CAST(strftime('%Y', a.tgl_arsip) AS INTEGER) + k.retensi_tahun END`

export default defineEventHandler(async (event) => {
  const id = Number(event.context.params?.id)
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID tidak valid' })

  const db = useDb()
  const res = await db.execute({
    sql: `SELECT a.*, k.kode AS klasifikasi_kode, k.nama AS klasifikasi_nama,
               COALESCE(k.retensi_tahun, 0) AS retensi_tahun,
               ${musnahExpr} AS tahun_musnah,
               sm.no_surat AS no_surat_masuk, sk.no_surat AS no_surat_keluar
          FROM arsip a
          LEFT JOIN klasifikasi k ON k.id = a.klasifikasi_id
          LEFT JOIN surat_masuk sm ON sm.id = a.ref_masuk_id
          LEFT JOIN surat_keluar sk ON sk.id = a.ref_keluar_id
          WHERE a.id = ? AND a.deleted_at IS NULL`,
    args: [id]
  })
  if (!res.rows.length) throw createError({ statusCode: 404, statusMessage: 'Arsip tidak ditemukan' })
  const r = res.rows[0] as any

  const nowY = new Date().getFullYear()
  const tm = r.tahun_musnah as number | null
  let status: 'aktif' | 'menjelang' | 'kadaluarsa' = 'aktif'
  let sisa: number | null = null
  if (tm != null) {
    sisa = tm - nowY
    if (sisa < 0) status = 'kadaluarsa'
    else if (sisa <= 1) status = 'menjelang'
  }

  return { ...r, status, sisa_tahun: sisa }
})
