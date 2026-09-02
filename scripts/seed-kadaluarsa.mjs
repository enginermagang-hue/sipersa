import { createClient } from '@libsql/client'
try { process.loadEnvFile('.env') } catch {}

const db = createClient({
  url: process.env.NUXT_TURSO_URL || 'file:.data/local.db',
  authToken: process.env.NUXT_TURSO_AUTH_TOKEN
})

const rows = [
  ['SK Pengangkatan Pegawai 2010 - Umum', 1, 'Rak A1', 2010, '2010-02-15'],
  ['Laporan Keuangan Tahunan 2011', 3, 'Rak B2', 2011, '2011-06-30'],
  ['Surat Tugas Perencanaan 2012', 4, 'Rak A2', 2012, '2012-03-10'],
  ['Kepegawaian - Daftar Hadir 2013', 2, 'Rak C1', 2013, '2013-09-01'],
  ['Berita Acara Umum 2014', 1, 'Rak A3', 2014, '2014-11-20'],
  ['Laporan Anggaran 2015', 3, 'Rak B3', 2015, '2015-05-12'],
  ['Dokumen Perencanaan 2010 - Arsip Lama', 4, 'Rak D1', 2010, '2010-07-07'],
  ['Arsip Kepegawaian 2011 - SK Lama', 2, 'Rak C2', 2011, '2011-01-10'],
]

let inserted = 0, skipped = 0
for (const [nama, klasId, lokasi, tahun, tgl] of rows) {
  const cek = await db.execute({ sql: 'SELECT id FROM arsip WHERE nama_dokumen=?', args: [nama] })
  if (cek.rows.length) { skipped++; console.log(`[skip] ${nama}`); continue }
  await db.execute({
    sql: `INSERT INTO arsip (nama_dokumen, klasifikasi_id, lokasi, tahun, tgl_arsip, sifat, created_at) VALUES (?,?,?,?,?,?,?)`,
    args: [nama, klasId, lokasi, tahun, tgl, 'biasa', tgl]
  })
  inserted++; console.log(`[insert] ${nama} -> ${tgl} klas=${klasId}`)
}
console.log(`\nSelesai: ${inserted} inserted, ${skipped} skipped`)
const s = await db.execute(`SELECT COUNT(*) as c FROM arsip a LEFT JOIN klasifikasi k ON k.id=a.klasifikasi_id WHERE a.deleted_at IS NULL AND CAST(strftime('%Y', a.tgl_arsip) AS INTEGER)+k.retensi_tahun < CAST(strftime('%Y','now') AS INTEGER)`)
console.log('Total kadaluarsa sekarang:', s.rows[0].c)
