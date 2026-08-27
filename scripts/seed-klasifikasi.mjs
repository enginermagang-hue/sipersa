import { createClient } from '@libsql/client'
import { readFileSync } from 'node:fs'

// Parse .env manually
const envContent = readFileSync('.env', 'utf8')
const env = {}
for (const line of envContent.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eqIdx = trimmed.indexOf('=')
  if (eqIdx === -1) continue
  const key = trimmed.slice(0, eqIdx).trim()
  const value = trimmed.slice(eqIdx + 1).trim()
  env[key] = value
}

const url = env.NUXT_TURSO_URL
const authToken = env.NUXT_TURSO_AUTH_TOKEN

if (!url || !authToken) {
  console.error('Error: NUXT_TURSO_URL atau NUXT_TURSO_AUTH_TOKEN tidak ditemukan di .env')
  process.exit(1)
}

console.log(`Connecting to: ${url}`)
const c = createClient({ url, authToken })

// Pastikan tabel klasifikasi ada
const t = await c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='klasifikasi'")
if (t.rows.length === 0) {
  await c.execute(`CREATE TABLE klasifikasi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kode TEXT NOT NULL,
    nama TEXT NOT NULL,
    deskripsi TEXT,
    retensi_tahun INTEGER,
    deleted_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`)
  console.log('Tabel klasifikasi dibuat')
} else {
  console.log('Tabel klasifikasi sudah ada')
}

// Cek apakah data sudah ada
const d = await c.execute('SELECT COUNT(*) as c FROM klasifikasi WHERE deleted_at IS NULL')
if (d.rows[0].c === 0) {
  const defaults = [
    ['001', 'Umum', 'Surat menyurat umum', 10],
    ['002', 'Kepegawaian', 'Surat terkait pegawai', 10],
    ['003', 'Keuangan', 'Surat keuangan & anggaran', 10],
    ['004', 'Perencanaan', 'Surat perencanaan & program', 10],
  ]
  for (const [kode, nama, deskripsi, retensi] of defaults) {
    await c.execute({
      sql: 'INSERT INTO klasifikasi (kode, nama, deskripsi, retensi_tahun) VALUES (?, ?, ?, ?)',
      args: [kode, nama, deskripsi, retensi]
    })
  }
  console.log('Klasifikasi default berhasil di-seed')
} else {
  console.log(`Klasifikasi sudah ada (${d.rows[0].c} data), tidak perlu seed`)
}

// Verifikasi
const r = await c.execute('SELECT id, kode, nama, deskripsi, retensi_tahun FROM klasifikasi WHERE deleted_at IS NULL ORDER BY id')
console.log('\nData klasifikasi saat ini:')
console.log(JSON.stringify(r.rows, null, 2))

await c.close()
