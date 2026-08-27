import { generateNoSuratKeluar, bulanRomawi } from '../../utils/no'
import { useDb } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const q = getQuery(event) as any
  const kode = (q.kode || q.klasifikasi_kode || '').toString().trim()
  const tgl = (q.tgl_surat as string) || new Date().toISOString().slice(0,10)
  const d = new Date(tgl.length===10?`${tgl}T00:00:00`:tgl)
  const year = d.getFullYear() || new Date().getFullYear()
  const month = d.getMonth()+1 || new Date().getMonth()+1
  const config = useRuntimeConfig()
  const tu = (config.public as any).nomorTU || 'TU'
  const unit = (config.public as any).nomorUnit || 'tekkomdik'
  if (!kode) {
    const db = useDb()
    const r = await db.execute({ sql: `SELECT MAX(no_urut) as m FROM surat_keluar WHERE no_surat LIKE ?`, args: [`%/${year}`] })
    const max = (r.rows[0] as any).m as number | null
    const n = (max??0)+1
    return { no_urut: n, no_surat: `_/${String(n).padStart(3,'0')}/${tu}/${unit}/${bulanRomawi(month)}/${year}`, needKlasifikasi: true }
  }
  // compat: klasifikasi_id legacy
  let finalKode = kode
  if (q.klasifikasi_id && !kode) {
    const db = useDb()
    const kr = await db.execute({ sql: 'SELECT kode FROM klasifikasi WHERE id = ? AND deleted_at IS NULL', args: [Number(q.klasifikasi_id)] })
    if (kr.rows.length) finalKode = (kr.rows[0] as any).kode as string
  }
  return generateNoSuratKeluar(finalKode, year, month, { tu, unit })
})
