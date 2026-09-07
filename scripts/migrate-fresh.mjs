// Skrip FRESH migrate: reset total DB lalu bangun ulang skema + seed admin default.
//   node scripts/migrate-fresh.mjs                 -> dry-run: tampilkan rencana, TIDAK mengeksekusi
//   node scripts/migrate-fresh.mjs --yes            -> eksekusi di DB LOKAL (.data/local.db)
//   node scripts/migrate-fresh.mjs --yes --turso     -> eksekusi di DB REMOTE (NUXT_TURSO_URL)
//   Tambahan flag: --keep-files (jangan hapus file Dropbox), --skip-seed (tanpa seed admin)
//
// PERINGATAN: destruktif — semua data di semua tabel dihapus. Hentikan dev server
// (`npm run dev`) sebelum eksekusi agar file SQLite lokal tidak terkunci.
//
// Sumber kebenaran skema: server/utils/migrate.ts. Skema di bawah adalah hasil
// gabungan CREATE TABLE + semua ensureColumn di sana. Jika migrate.ts berubah,
// sinkronkan manual bagian SCHEMA di file ini.

import { createClient } from '@libsql/client'
import bcrypt from 'bcryptjs'

try {
  process.loadEnvFile('.env')
} catch {
  // .env opsional (mis. CI); fallback ke default lokal
}

const args = new Set(process.argv.slice(2))
const CONFIRMED = args.has('--yes')
const TURSO_FLAG = args.has('--turso')
const KEEP_FILES = args.has('--keep-files')
const SKIP_SEED = args.has('--skip-seed')

const DB_URL = process.env.NUXT_TURSO_URL || 'file:.data/local.db'
const IS_REMOTE = !DB_URL.startsWith('file:')

const TABLES = [
  'users',
  'sessions',
  'klasifikasi',
  'surat_masuk',
  'surat_keluar',
  'surat_keluar_approval',
  'disposisi',
  'arsip',
  'notifications',
  'activity_log',
  'wa_outbox',
  'wa_inbound'
]

// Urutan drop: anak dulu baru induk (aman juga karena foreign_keys dimatikan saat drop)
const DROP_ORDER = [
  'disposisi',
  'surat_keluar_approval',
  'arsip',
  'surat_masuk',
  'surat_keluar',
  'sessions',
  'notifications',
  'activity_log',
  'wa_outbox',
  'wa_inbound',
  'users',
  'klasifikasi'
]

// Skema final = CREATE TABLE di migrate.ts + semua kolom hasil ensureColumn.
const SCHEMA = [
  `CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    email TEXT,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'staff',
    status TEXT NOT NULL DEFAULT 'active',
    last_login TEXT,
    deleted_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    ttd_file_drive_id TEXT,
    ttd_file_name TEXT,
    google_id TEXT,
    nip TEXT,
    no_hp TEXT,
    unit_kerja TEXT,
    jabatan TEXT,
    tanggal_bergabung TEXT,
    email_notifikasi INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    last_active TEXT,
    revoked INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,
  `CREATE TABLE klasifikasi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kode TEXT NOT NULL,
    nama TEXT NOT NULL,
    deskripsi TEXT,
    retensi_tahun INTEGER,
    deleted_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE surat_masuk (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    no_agenda TEXT,
    no_urut INTEGER NOT NULL,
    no_surat TEXT NOT NULL,
    klasifikasi_id INTEGER,
    tgl_surat TEXT NOT NULL,
    tgl_terima TEXT NOT NULL,
    pengirim TEXT NOT NULL,
    perihal TEXT NOT NULL,
    sifat TEXT NOT NULL DEFAULT 'biasa',
    file_drive_id TEXT,
    file_name TEXT,
    created_by INTEGER,
    deleted_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    ringkasan TEXT,
    status TEXT NOT NULL DEFAULT 'diterima',
    FOREIGN KEY (klasifikasi_id) REFERENCES klasifikasi(id)
  )`,
  `CREATE TABLE surat_keluar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    no_urut INTEGER NOT NULL,
    no_surat TEXT NOT NULL,
    klasifikasi_id INTEGER,
    tgl_surat TEXT NOT NULL,
    tujuan TEXT NOT NULL,
    perihal TEXT NOT NULL,
    sifat TEXT NOT NULL DEFAULT 'biasa',
    status TEXT NOT NULL DEFAULT 'diterima',
    penandatangan TEXT,
    html_content TEXT,
    render_config TEXT,
    submitted_at TEXT,
    submitted_by INTEGER,
    approved_at TEXT,
    approved_by INTEGER,
    catatan_tolak TEXT,
    file_drive_id TEXT,
    file_name TEXT,
    created_by INTEGER,
    deleted_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    klasifikasi_kode TEXT,
    penandatangan_id INTEGER REFERENCES users(id),
    FOREIGN KEY (klasifikasi_id) REFERENCES klasifikasi(id)
  )`,
  `CREATE TABLE surat_keluar_approval (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    surat_keluar_id INTEGER NOT NULL,
    reviewed_by INTEGER NOT NULL,
    status TEXT NOT NULL,
    catatan TEXT,
    reviewed_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (surat_keluar_id) REFERENCES surat_keluar(id),
    FOREIGN KEY (reviewed_by) REFERENCES users(id)
  )`,
  `CREATE TABLE disposisi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    surat_masuk_id INTEGER NOT NULL,
    parent_id INTEGER,
    dari_user_id INTEGER NOT NULL,
    kepada_user_id INTEGER NOT NULL,
    instruksi TEXT,
    catatan TEXT,
    status TEXT NOT NULL DEFAULT 'baru',
    prioritas TEXT NOT NULL DEFAULT 'normal',
    batas_waktu TEXT,
    diproses_at TEXT,
    selesai_at TEXT,
    sifat_disposisi TEXT NOT NULL DEFAULT 'biasa',
    instruksi_list TEXT,
    notify INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (surat_masuk_id) REFERENCES surat_masuk(id),
    FOREIGN KEY (parent_id) REFERENCES disposisi(id),
    FOREIGN KEY (dari_user_id) REFERENCES users(id),
    FOREIGN KEY (kepada_user_id) REFERENCES users(id)
  )`,
  `CREATE TABLE arsip (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ref_masuk_id INTEGER,
    ref_keluar_id INTEGER,
    klasifikasi_id INTEGER,
    nama_dokumen TEXT NOT NULL,
    lokasi TEXT,
    tahun INTEGER,
    sifat TEXT NOT NULL DEFAULT 'biasa',
    deleted_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    tgl_arsip TEXT,
    alasan_musnah TEXT,
    file_drive_id TEXT,
    file_name TEXT,
    FOREIGN KEY (klasifikasi_id) REFERENCES klasifikasi(id)
  )`,
  `CREATE TABLE notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    entity TEXT,
    entity_id INTEGER,
    "read" INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,
  `CREATE TABLE activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    entity TEXT,
    entity_id INTEGER,
    detail TEXT,
    ip_address TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE wa_outbox (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    to_phone TEXT NOT NULL,
    target_user_id INTEGER,
    message TEXT NOT NULL,
    entity TEXT,
    entity_id INTEGER,
    status TEXT NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    fonnte_response TEXT,
    sent_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE wa_inbound (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender TEXT NOT NULL,
    message TEXT NOT NULL,
    raw TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  'CREATE INDEX idx_disposisi_parent ON disposisi(parent_id)',
  'CREATE UNIQUE INDEX idx_users_google_id ON users(google_id)',
  'CREATE INDEX idx_users_email_lower ON users(LOWER(TRIM(email)))',
  'CREATE INDEX idx_arsip_ref_masuk ON arsip(ref_masuk_id)',
  'CREATE INDEX idx_arsip_ref_keluar ON arsip(ref_keluar_id)',
  'CREATE INDEX idx_wa_outbox_status ON wa_outbox(status)'
]

// ---------- Dropbox (pola sama seperti seed.mjs / migrate-dropbox.mjs) ----------
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

async function runPool(items, worker, concurrency = 5) {
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
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runner))
  return results
}

async function collectFileIds(db) {
  const queries = [
    { sql: 'SELECT file_drive_id FROM surat_masuk WHERE file_drive_id IS NOT NULL AND file_drive_id != ?' },
    { sql: 'SELECT file_drive_id FROM surat_keluar WHERE file_drive_id IS NOT NULL AND file_drive_id != ?' },
    { sql: 'SELECT file_drive_id FROM arsip WHERE file_drive_id IS NOT NULL AND file_drive_id != ?' },
    { sql: 'SELECT ttd_file_drive_id AS file_drive_id FROM users WHERE ttd_file_drive_id IS NOT NULL AND ttd_file_drive_id != ?' }
  ]
  const ids = []
  for (const q of queries) {
    try {
      const r = await db.execute({ sql: q.sql, args: [''] })
      for (const row of r.rows) ids.push(String(row.file_drive_id))
    } catch {
      // Tabel belum ada (DB kosong) — lewati
    }
  }
  return [...new Set(ids)]
}

async function countRows(db) {
  const out = {}
  for (const t of TABLES) {
    try {
      const r = await db.execute(`SELECT COUNT(*) as c FROM ${t}`)
      out[t] = Number(r.rows[0].c)
    } catch {
      out[t] = '-(tabel tidak ada)'
    }
  }
  return out
}

async function seedAdmin(db) {
  const res = await db.execute('SELECT COUNT(*) as c FROM users')
  if (Number(res.rows[0].c) > 0) {
    console.log('Seed dilewati: tabel users sudah berisi data.')
    return
  }
  const hash = await bcrypt.hash('admin123', 10)
  await db.execute({
    sql: 'INSERT INTO users (nama, username, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?, ?)',
    args: ['Administrator', 'admin', 'admin@instansi.local', hash, 'admin', 'active']
  })
  const defaults = [
    ['001', 'Umum', 'Surat menyurat umum'],
    ['002', 'Kepegawaian', 'Surat terkait pegawai'],
    ['003', 'Keuangan', 'Surat keuangan & anggaran'],
    ['004', 'Perencanaan', 'Surat perencanaan & program']
  ]
  for (const [kode, nama, deskripsi] of defaults) {
    await db.execute({
      sql: 'INSERT INTO klasifikasi (kode, nama, deskripsi, retensi_tahun) VALUES (?, ?, ?, ?)',
      args: [kode, nama, deskripsi, 10]
    })
  }
  console.log('Seed: admin/admin123 + 4 klasifikasi default.')
}

async function main() {
  console.log(`Target DB: ${IS_REMOTE ? 'REMOTE (Turso)' : 'LOKAL'} — ${IS_REMOTE ? DB_URL : DB_URL.replace(/^file:/, '')}`)

  if (IS_REMOTE && !TURSO_FLAG) {
    console.error('ABORT: target adalah database REMOTE. Tambahkan flag --turso untuk konfirmasi eksplisit.')
    console.error('Contoh: node scripts/migrate-fresh.mjs --yes --turso')
    process.exit(1)
  }

  const db = createClient({ url: DB_URL, authToken: process.env.NUXT_TURSO_AUTH_TOKEN })
  const before = await countRows(db)
  const fileIds = KEEP_FILES ? [] : await collectFileIds(db)

  if (!CONFIRMED) {
    console.log('\n=== DRY-RUN (tidak ada yang dieksekusi — tambahkan --yes untuk eksekusi) ===')
    console.log('Isi tabel saat ini:')
    for (const [t, c] of Object.entries(before)) console.log(`  ${t}: ${c}`)
    console.log(`\nYang akan dilakukan:`)
    console.log(`  1. Hapus ${fileIds.length} file Dropbox (atau --keep-files untuk melewati)`)
    console.log(`  2. DROP TABLE: ${DROP_ORDER.join(', ')}`)
    console.log(`  3. CREATE ulang ${SCHEMA.length} pernyataan skema + index`)
    console.log(`  4. ${SKIP_SEED ? 'Lewati seed (--skip-seed)' : 'Seed admin/admin123 + 4 klasifikasi'}`)
    console.log('\nPastikan dev server (npm run dev) SUDAH dihentikan sebelum eksekusi di DB lokal.')
    process.exit(1)
  }

  console.log('\nIsi tabel sebelum reset:')
  for (const [t, c] of Object.entries(before)) console.log(`  ${t}: ${c}`)

  // 1. Hapus file Dropbox selagi ID-nya masih tercatat di DB
  if (!KEEP_FILES) {
    if (fileIds.length === 0) {
      console.log('\nTidak ada file Dropbox yang terdaftar di DB.')
    } else {
      console.log(`\nHapus ${fileIds.length} file Dropbox...`)
      try {
        await getAccessToken()
      } catch (err) {
        console.error(`[WARN] Dropbox tidak terkonfigurasi (${err.message}) — lanjut reset DB saja.`)
      }
      const del = await runPool(fileIds, deleteFile)
      const ok = del.filter((r) => r.ok).length
      console.log(`Dropbox: ${ok} ok, ${del.length - ok} gagal.`)
      const fails = del.filter((r) => !r.ok).slice(0, 3).map((r) => r.error)
      if (fails.length > 0) console.log(`  Contoh error: ${fails.join(' | ')}`)
    }
  } else {
    console.log('\nLewati penghapusan Dropbox (--keep-files).')
  }

  // 2. Drop semua tabel
  console.log('\nDrop tabel...')
  await db.execute('PRAGMA foreign_keys=OFF')
  try {
    for (const t of DROP_ORDER) {
      await db.execute(`DROP TABLE IF EXISTS ${t}`)
    }
  } finally {
    await db.execute('PRAGMA foreign_keys=ON')
  }

  // 3. Bangun ulang skema
  console.log(`Bangun ulang skema (${SCHEMA.length} pernyataan)...`)
  for (const sql of SCHEMA) {
    await db.execute(sql)
  }

  // 4. Seed
  if (SKIP_SEED) {
    console.log('Lewati seed (--skip-seed).')
  } else {
    await seedAdmin(db)
  }

  // 5. Verifikasi
  console.log('\nIsi tabel sesudah reset:')
  const after = await countRows(db)
  for (const [t, c] of Object.entries(after)) console.log(`  ${t}: ${c}`)

  try {
    const tables = await db.execute(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`)
    console.log(`\nTabel di DB: ${tables.rows.map((r) => r.name).join(', ')}`)
  } catch {}

  console.log('\nFresh migrate selesai. Login default: admin / admin123.')
  try {
    await db.close()
  } catch {}
}

main().catch((err) => {
  console.error('Fresh migrate gagal:', err.message)
  process.exit(1)
})
