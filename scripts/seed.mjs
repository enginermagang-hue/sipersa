// Seeder 1000 data contoh (campuran) + file dummy di-upload ke Dropbox.
//   node scripts/seed.mjs          -> insert 1000 (abort bila tabel sudah berisi)
//   node scripts/seed.mjs --reset  -> hapus data lama (+ file Dropbox terkait) lalu seed ulang
// Butuh config Dropbox di .env: NUXT_DROPBOX_REFRESH_TOKEN atau NUXT_DROPBOX_TOKEN.

import { createClient } from '@libsql/client'
import bcrypt from 'bcryptjs'

process.loadEnvFile('.env')

const db = createClient({
  url: process.env.NUXT_TURSO_URL || 'file:.data/local.db',
  authToken: process.env.NUXT_TURSO_AUTH_TOKEN
})

const COUNTS = { surat_masuk: 400, surat_keluar: 300, arsip: 200, disposisi: 100 }
const CONCURRENCY = 5
const YEAR = new Date().getFullYear()

const ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ---------- Dropbox (token dari env, pola sama seperti migrate-dropbox.mjs) ----------
let cachedToken = null
let refreshing = null

async function getAccessToken() {
  const refreshToken = process.env.NUXT_DROPBOX_REFRESH_TOKEN || ''
  if (!refreshToken) {
    const staticToken = process.env.NUXT_DROPBOX_TOKEN || ''
    if (!staticToken) throw new Error('NUXT_DROPBOX_TOKEN / NUXT_DROPBOX_REFRESH_TOKEN belum di-set di .env')
    return staticToken
  }
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.token
  if (refreshing) return refreshing
  const appKey = process.env.NUXT_DROPBOX_APP_KEY || ''
  const appSecret = process.env.NUXT_DROPBOX_APP_SECRET || ''
  if (!appKey || !appSecret) throw new Error('NUXT_DROPBOX_APP_KEY / NUXT_DROPBOX_APP_SECRET belum di-set di .env (untuk refresh token)')
  refreshing = (async () => {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: appKey,
      client_secret: appSecret
    })
    const res = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Gagal refresh token Dropbox (${res.status}): ${text.slice(0, 200)}`)
    }
    const json = await res.json()
    cachedToken = { token: json.access_token, expiresAt: Date.now() + (json.expires_in || 14400) * 1000 }
    return cachedToken.token
  })().finally(() => { refreshing = null })
  return refreshing
}

function extractDropboxTag(bodyText) {
  try {
    const obj = JSON.parse(bodyText)
    const candidates = []
    if (obj?.error?.['.tag']) candidates.push(String(obj.error['.tag']))
    if (obj?.error?.path?.['.tag']) candidates.push(String(obj.error.path['.tag']))
    if (typeof obj?.error_summary === 'string') candidates.push(obj.error_summary.split('/')[0])
    return [...new Set(candidates)].join('|')
  } catch { return '' }
}

async function uploadFile(fileName, data, folder) {
  const token = await getAccessToken()
  const safe = fileName.replace(/[\\/]/g, '-')
  const res = await fetch('https://content.dropboxapi.com/2/files/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Dropbox-API-Arg': JSON.stringify({ path: `/${folder}/${safe}`, mode: 'add', autorename: true }),
      'Content-Type': 'application/octet-stream'
    },
    body: data
  })
  if (res.ok) {
    const json = await res.json()
    return { id: json.id, name: json.name }
  }
  const text = await res.text()
  const tag = extractDropboxTag(text)
  if (res.status === 429 || /rate_limit|too_many/.test(tag)) {
    throw Object.assign(new Error('rate-limited'), { rateLimited: true })
  }
  throw new Error(`upload ${fileName} gagal (${res.status}): ${text.slice(0, 150)}`)
}

async function uploadWithRetry(fileName, data, folder, attempts = 5) {
  let lastErr = null
  for (let i = 0; i < attempts; i++) {
    try {
      return await uploadFile(fileName, data, folder)
    } catch (err) {
      lastErr = err
      if (!err.rateLimited) throw err
      await sleep(1000 * 2 ** i + Math.random() * 500)
    }
  }
  throw lastErr
}

async function deleteFile(fileId) {
  const token = await getAccessToken()
  const res = await fetch('https://api.dropboxapi.com/2/files/delete_v2', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: fileId })
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`hapus ${fileId} gagal (${res.status}): ${text.slice(0, 150)}`)
  }
}

// ---------- PDF dummy minimal yang valid ----------
function makePdf(text) {
  const safe = String(text || 'Dokumen').replace(/[()\\]/g, '')
  const stream = `BT /F1 12 Tf 72 720 Td (${safe}) Tj ET`
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  ]
  let out = '%PDF-1.4\n'
  const offsets = []
  for (let i = 0; i < objs.length; i++) {
    offsets.push(out.length)
    out += `${i + 1} 0 obj\n${objs[i]}\nendobj\n`
  }
  const xrefStart = out.length
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`
  for (const o of offsets) out += `${String(o).padStart(10, '0')} 00000 n \n`
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`
  return Buffer.from(out, 'latin1')
}

// ---------- Pool concurrency ----------
async function runPool(items, worker) {
  const results = new Array(items.length)
  let idx = 0
  async function runner() {
    while (idx < items.length) {
      const i = idx++
      try {
        results[i] = { ok: true, data: await worker(items[i]) }
      } catch (err) {
        results[i] = { ok: false, error: err.message }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, runner))
  return results
}

function poolSummary(results, label) {
  const ok = results.filter((r) => r.ok).length
  const fail = results.length - ok
  console.log(`  ${label}: ${ok} ok${fail > 0 ? `, ${fail} gagal` : ''}`)
  if (fail > 0) console.log(`    Contoh error: ${results.filter((r) => !r.ok).slice(0, 3).map((r) => r.error).join(' | ')}`)
}

// ---------- Helper data ----------
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)]
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const pad2 = (n) => String(n).padStart(2, '0')

function randDate() {
  return `${YEAR}-${pad2(randInt(1, 12))}-${pad2(randInt(1, 28))}`
}
function randDateAfter(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  const base = new Date(y, m - 1, d)
  base.setDate(base.getDate() + randInt(0, 7))
  return `${base.getFullYear()}-${pad2(base.getMonth() + 1)}-${pad2(base.getDate())}`
}

function makeNo(noUrut, prefix, isoDate) {
  const month = Number(isoDate.slice(5, 7))
  return `${String(noUrut).padStart(3, '0')}/${prefix}/${ROMAWI[month - 1]}/${YEAR}`
}

async function nextNo(table, prefix) {
  const r = await db.execute({ sql: `SELECT MAX(no_urut) as m FROM ${table} WHERE no_surat LIKE ?`, args: [`%/${YEAR}`] })
  return Number(r.rows[0]?.m || 0) + 1
}

const PENGIRIM = [
  'Dinas Pendidikan', 'Kementerian Keuangan', 'Badan Kepegawaian Negara', 'Kantor Kecamatan Sawangan',
  'Universitas Indonesia', 'PT PLN (Persero)', 'Direktorat Jenderal Pajak', 'Badan Pusat Statistik',
  'Kemenag RI', 'Dinas Kesehatan', 'Pemerintah Provinsi DKI', 'BPJS Kesehatan', 'Kemenkumham',
  'Bank Indonesia', 'KPU RI'
]
const PERIHAL = [
  'Undangan Rapat Koordinasi', 'Permohonan Izin Penelitian', 'Pemberitahuan Kegiatan', 'Surat Tugas',
  'Penyampaian Laporan', 'Permohonan Data & Informasi', 'Sosialisasi Program', 'Permintaan Kerja Sama',
  'Penawaran Kerja Sama', 'Klarifikasi Dokumen', 'Permohonan Rekomendasi', 'Hasil Evaluasi',
  'Undangan Diklat', 'Permohonan Mutasi', 'Pemberitahuan Perubahan Alamat'
]
const SIFAT = ['biasa', 'segera', 'rahasia', 'penting']
const INST_SUB = ['Nota Dinas', 'Surat Edaran', 'Undangan', 'Permohonan', 'Pemberitahuan', 'Laporan', 'Sertifikat', 'SK', 'Berita Acara', 'Memorandum']
const NAMA_PEGAWAI = ['Budi Santoso', 'Siti Rahayu', 'Agus Salim', 'Dewi Lestari', 'Rudi Hartono', 'Maya Sari', 'Joko Widodo', 'Ratna Dewi']
const INSTRUKSI_LIST = [
  ['Ditunggu hasilnya'],
  ['Proses sesuai ketentuan'],
  ['Koordinasi dengan pihak terkait'],
  ['Segera ditindaklanjuti'],
  ['Arsipkan setelah diproses']
]

// ---------- Referensi ----------
async function ensureKlasifikasi() {
  const res = await db.execute('SELECT id FROM klasifikasi WHERE deleted_at IS NULL')
  if (res.rows.length > 0) return res.rows.map((r) => Number(r.id))
  const defaults = [
    ['001', 'Umum', 'Surat menyurat umum'],
    ['002', 'Kepegawaian', 'Surat terkait pegawai'],
    ['003', 'Keuangan', 'Surat keuangan & anggaran'],
    ['004', 'Perencanaan', 'Surat perencanaan & program']
  ]
  const ids = []
  for (const [kode, nama, deskripsi] of defaults) {
    const r = await db.execute({ sql: 'INSERT INTO klasifikasi (kode, nama, deskripsi, retensi_tahun) VALUES (?, ?, ?, ?)', args: [kode, nama, deskripsi, 10] })
    ids.push(Number(r.lastInsertRowid))
  }
  return ids
}

async function ensureUsers() {
  const res = await db.execute('SELECT id, role FROM users WHERE deleted_at IS NULL')
  const ids = res.rows.map((r) => Number(r.id))
  if (ids.length >= 3) return ids
  for (let i = ids.length + 1; i <= 8; i++) {
    const role = i % 2 === 0 ? 'pimpinan' : 'staff'
    const hash = await bcrypt.hash('seed123', 10)
    const r = await db.execute({
      sql: 'INSERT INTO users (nama, username, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?, ?)',
      args: [`Seed User ${i}`, `seeduser${i}`, `seeduser${i}@instansi.local`, hash, role, 'active']
    })
    ids.push(Number(r.lastInsertRowid))
  }
  return ids
}

const FOLDERS = { SM: 'Surat Masuk', SK: 'Surat Keluar', ARSIP: 'Arsip' }

// ---------- Insert per tabel ----------
async function insertSuratMasuk(item, dropboxOk) {
  let fid = null
  let fname = null
  if (dropboxOk) {
    const up = await uploadWithRetry(`${item.noSurat}_surat.pdf`, makePdf(item.perihal), FOLDERS.SM)
    fid = up.id
    fname = 'surat.pdf'
  }
  const res = await db.execute({
    sql: `INSERT INTO surat_masuk (no_agenda, no_urut, no_surat, klasifikasi_id, tgl_surat, tgl_terima, pengirim, perihal, sifat, file_drive_id, file_name, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [null, item.noUrut, item.noSurat, item.klasifikasi_id, item.tgl_surat, item.tgl_terima, item.pengirim, item.perihal, item.sifat, fid, fname, item.created_by]
  })
  return Number(res.lastInsertRowid)
}

async function insertSuratKeluar(item, dropboxOk) {
  let fid = null
  let fname = null
  if (dropboxOk) {
    const up = await uploadWithRetry(`${item.noSurat}_surat.pdf`, makePdf(item.perihal), FOLDERS.SK)
    fid = up.id
    fname = 'surat.pdf'
  }
  const res = await db.execute({
    sql: `INSERT INTO surat_keluar (no_urut, no_surat, klasifikasi_id, tgl_surat, tujuan, perihal, sifat, status, penandatangan, file_drive_id, file_name, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [item.noUrut, item.noSurat, item.klasifikasi_id, item.tgl_surat, item.tujuan, item.perihal, item.sifat, item.status, item.penandatangan, fid, fname, item.created_by]
  })
  return Number(res.lastInsertRowid)
}

async function insertArsip(item, dropboxOk) {
  let fid = null
  let fname = null
  if (dropboxOk) {
    const up = await uploadWithRetry(`${item.nama_dokumen}_dokumen.pdf`, makePdf(item.nama_dokumen), FOLDERS.ARSIP)
    fid = up.id
    fname = 'dokumen.pdf'
  }
  const res = await db.execute({
    sql: `INSERT INTO arsip (ref_masuk_id, ref_keluar_id, klasifikasi_id, nama_dokumen, lokasi, tahun, file_drive_id, file_name, tgl_arsip)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    args: [item.ref_masuk_id, item.ref_keluar_id, item.klasifikasi_id, item.nama_dokumen, item.lokasi, item.tahun, fid, fname]
  })
  return Number(res.lastInsertRowid)
}

async function insertDisposisi(item) {
  const res = await db.execute({
    sql: `INSERT INTO disposisi (surat_masuk_id, dari_user_id, kepada_user_id, instruksi, instruksi_list, catatan, status, sifat_disposisi, batas_waktu, notify, diproses_at, selesai_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      item.surat_masuk_id, item.dari_user_id, item.kepada_user_id, item.instruksi, JSON.stringify(item.instruksi_list),
      item.catatan, item.status, item.sifat, item.batas_waktu, item.notify, item.diproses_at, item.selesai_at
    ]
  })
  return Number(res.lastInsertRowid)
}

// ---------- Main ----------
async function main() {
  const reset = process.argv.includes('--reset')

  let dropboxOk = true
  try {
    await getAccessToken()
  } catch (err) {
    console.error(`[ERROR] ${err.message}`)
    console.error('Seeder membutuhkan config Dropbox (sesuai pilihan "dengan file"). Perbaiki .env lalu jalankan ulang.')
    process.exit(1)
  }

  const existing = {}
  for (const t of Object.keys(COUNTS)) {
    const r = await db.execute(`SELECT COUNT(*) as c FROM ${t}`)
    existing[t] = Number(r.rows[0].c)
  }
  const hasOld = Object.values(existing).some((c) => c > 0)

  if (hasOld && !reset) {
    console.error(`Tabel sudah berisi data (surat_masuk=${existing.surat_masuk}, surat_keluar=${existing.surat_keluar}, arsip=${existing.arsip}, disposisi=${existing.disposisi}).`)
    console.error('Jalankan `node scripts/seed.mjs --reset` untuk menghapus & seed ulang.')
    process.exit(1)
  }

  if (reset && hasOld) {
    const fileIds = []
    for (const t of ['surat_masuk', 'surat_keluar', 'arsip']) {
      const r = await db.execute({ sql: `SELECT file_drive_id FROM ${t} WHERE file_drive_id IS NOT NULL AND file_drive_id != ''` })
      for (const row of r.rows) fileIds.push(String(row.file_drive_id))
    }
    if (fileIds.length > 0) {
      const del = await runPool(fileIds, deleteFile)
      console.log(`Hapus file Dropbox lama: ${del.filter((r) => r.ok).length} ok, ${del.length - del.filter((r) => r.ok).length} gagal.`)
    }
    for (const t of ['disposisi', 'arsip', 'surat_keluar', 'surat_masuk']) {
      await db.execute(`DELETE FROM ${t}`)
    }
    console.log('Data lama dihapus (DB + file Dropbox).')
  } else if (reset) {
    console.log('Tabel sudah kosong, langsung seed.')
  }

  const klasifikasiIds = await ensureKlasifikasi()
  const userIds = await ensureUsers()
  console.log(`Referensi siap: ${klasifikasiIds.length} klasifikasi, ${userIds.length} user.`)

  const t0 = Date.now()

  // -- Surat Masuk --
  const startMasuk = await nextNo('surat_masuk', 'SM-INST')
  const itemsMasuk = Array.from({ length: COUNTS.surat_masuk }, (_, i) => {
    const tglSurat = randDate()
    return {
      noUrut: startMasuk + i,
      noSurat: makeNo(startMasuk + i, 'SM-INST', tglSurat),
      klasifikasi_id: rand(klasifikasiIds),
      tgl_surat: tglSurat,
      tgl_terima: randDateAfter(tglSurat),
      pengirim: rand(PENGIRIM),
      perihal: `${rand(PERIHAL)} #${i + 1}`,
      sifat: rand(SIFAT),
      created_by: rand(userIds)
    }
  })
  console.log(`\nSeed surat_masuk (${itemsMasuk.length})...`)
  const resMasuk = await runPool(itemsMasuk, (it) => insertSuratMasuk(it, dropboxOk))
  poolSummary(resMasuk, 'surat_masuk')
  const masuIds = itemsMasuk.map((it, i) => (resMasuk[i].ok ? resMasuk[i].data : null)).filter((v) => v !== null)

  // -- Surat Keluar --
  const startKeluar = await nextNo('surat_keluar', 'SK-INST')
  const itemsKeluar = Array.from({ length: COUNTS.surat_keluar }, (_, i) => {
    const tglSurat = randDate()
    return {
      noUrut: startKeluar + i,
      noSurat: makeNo(startKeluar + i, 'SK-INST', tglSurat),
      klasifikasi_id: rand(klasifikasiIds),
      tgl_surat: tglSurat,
      tujuan: rand(PENGIRIM),
      perihal: `${rand(PERIHAL)} #${i + 1}`,
      sifat: rand(SIFAT),
      status: rand(['terkirim', 'terkirim', 'terkirim', 'selesai', 'draft']),
      penandatangan: rand(NAMA_PEGAWAI),
      created_by: rand(userIds)
    }
  })
  console.log(`Seed surat_keluar (${itemsKeluar.length})...`)
  const resKeluar = await runPool(itemsKeluar, (it) => insertSuratKeluar(it, dropboxOk))
  poolSummary(resKeluar, 'surat_keluar')
  const keluarIds = itemsKeluar.map((it, i) => (resKeluar[i].ok ? resKeluar[i].data : null)).filter((v) => v !== null)

  // -- Arsip := (link distinct surat masuk/keluar) --
  const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5)
  const masuShuf = shuffle(masuIds)
  const kelShuf = shuffle(keluarIds)
  const arsipCount = Math.min(COUNTS.arsip, masuIds.length + keluarIds.length)
  const takeMasuk = Math.min(Math.floor(arsipCount * 0.6), masuIds.length)
  const itemsArsip = Array.from({ length: arsipCount }, (_, i) => {
    const isMasuk = i < takeMasuk
    const ist = rand(INST_SUB)
    const nama = `${ist} ${rand(PENGIRIM)} ${i + 1}`
    return {
      ref_masuk_id: isMasuk ? masuShuf[i] : null,
      ref_keluar_id: isMasuk ? null : kelShuf[i - takeMasuk],
      klasifikasi_id: rand(klasifikasiIds),
      nama_dokumen: nama,
      lokasi: [`Rak ${randInt(1, 10)}`, `Lantai ${randInt(1, 3)}`, 'Box Arsip', 'Lemari Besi'][randInt(0, 3)],
      tahun: YEAR
    }
  })
  console.log(`Seed arsip (${itemsArsip.length})...`)
  const resArsip = await runPool(itemsArsip, (it) => insertArsip(it, dropboxOk))
  poolSummary(resArsip, 'arsip')

  // -- Disposisi -- (butuh minimal 1 surat masuk)
  if (masuIds.length > 0) {
    const users = await db.execute('SELECT id, role FROM users WHERE deleted_at IS NULL')
    const byRole = users.rows.reduce((acc, r) => {
      acc[r.role] = acc[r.role] || []
      acc[r.role].push(Number(r.id))
      return acc
    }, {})
    const pimpinanIds = [...(byRole.pimpinan || []), ...(byRole.admin || [])]
    const staffIds = byRole.staff || []
    const dariPool = pimpinanIds.length > 0 ? pimpinanIds : userIds
    const kepadaPool = staffIds.length > 0 ? staffIds : userIds
    const itemsDisposisi = Array.from({ length: COUNTS.disposisi }, () => {
      const status = rand(['baru', 'baru', 'proses', 'selesai'])
      const batasWaktu = status === 'baru' ? (Math.random() < 0.5 ? randDate() : null) : randDate()
      return {
        surat_masuk_id: rand(masuIds),
        dari_user_id: rand(dariPool),
        kepada_user_id: rand(kepadaPool),
        instruksi: rand(INSTRUKSI_LIST).join('; '),
        instruksi_list: rand(INSTRUKSI_LIST),
        catatan: Math.random() < 0.6 ? 'Segera diproses.' : '',
        status,
        sifat: rand(['biasa', 'segera', 'sangat_segera', 'rahasia']),
        batas_waktu: batasWaktu,
        notify: 0,
        diproses_at: status !== 'baru' ? randDate() : null,
        selesai_at: status === 'selesai' ? randDate() : null
      }
    })
    console.log(`Seed disposisi (${itemsDisposisi.length})...`)
    const resDisposisi = await runPool(itemsDisposisi, insertDisposisi)
    poolSummary(resDisposisi, 'disposisi')
  } else {
    console.log('Disposisi dilewati: tidak ada surat_masuk yang berhasil.')
  }

  console.log(`\nSelesai dalam ${((Date.now() - t0) / 1000).toFixed(1)}s.`)
  console.log(`Total record dibuat: ${COUNTS.surat_masuk + COUNTS.surat_keluar + COUNTS.arsip + COUNTS.disposisi} (per konstanta COUNTS; yang gagal di-skip).`)
}

main().catch((err) => {
  console.error('Seeder gagal:', err.message)
  process.exit(1)
})