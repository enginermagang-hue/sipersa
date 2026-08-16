import { useDb } from './db'
import bcrypt from 'bcryptjs'

export async function migrate() {
  const db = useDb()
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      email TEXT,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'staff_tu',
      status TEXT NOT NULL DEFAULT 'active',
      last_login TEXT,
      deleted_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS sessions (
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
    `CREATE TABLE IF NOT EXISTS klasifikasi (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kode TEXT NOT NULL,
      nama TEXT NOT NULL,
      deskripsi TEXT,
      retensi_tahun INTEGER,
      deleted_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS surat_masuk (
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
      FOREIGN KEY (klasifikasi_id) REFERENCES klasifikasi(id)
    )`,
    `CREATE TABLE IF NOT EXISTS surat_keluar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      no_urut INTEGER NOT NULL,
      no_surat TEXT NOT NULL,
      klasifikasi_id INTEGER,
      tgl_surat TEXT NOT NULL,
      tujuan TEXT NOT NULL,
      perihal TEXT NOT NULL,
      sifat TEXT NOT NULL DEFAULT 'biasa',
      file_drive_id TEXT,
      file_name TEXT,
      created_by INTEGER,
      deleted_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (klasifikasi_id) REFERENCES klasifikasi(id)
    )`,
    `CREATE TABLE IF NOT EXISTS disposisi (
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
      deleted_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (surat_masuk_id) REFERENCES surat_masuk(id),
      FOREIGN KEY (parent_id) REFERENCES disposisi(id),
      FOREIGN KEY (dari_user_id) REFERENCES users(id),
      FOREIGN KEY (kepada_user_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS arsip (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ref_masuk_id INTEGER,
      ref_keluar_id INTEGER,
      klasifikasi_id INTEGER,
      nama_dokumen TEXT NOT NULL,
      lokasi TEXT,
      tahun INTEGER,
      deleted_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (klasifikasi_id) REFERENCES klasifikasi(id)
    )`,
    `CREATE TABLE IF NOT EXISTS notifications (
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
    `CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      entity TEXT,
      entity_id INTEGER,
      detail TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  ]

  for (const sql of statements) {
    await db.execute(sql)
  }

  await ensureColumn('disposisi', 'parent_id', 'parent_id INTEGER REFERENCES disposisi(id)')
  await ensureColumn('disposisi', 'prioritas', "prioritas TEXT NOT NULL DEFAULT 'normal'")
  await ensureColumn('disposisi', 'batas_waktu', 'batas_waktu TEXT')
  await ensureColumn('disposisi', 'diproses_at', 'diproses_at TEXT')
  await ensureColumn('disposisi', 'selesai_at', 'selesai_at TEXT')
  await ensureColumn('disposisi', 'sifat_disposisi', "sifat_disposisi TEXT NOT NULL DEFAULT 'biasa'")
  await ensureColumn('disposisi', 'instruksi_list', 'instruksi_list TEXT')
  await ensureColumn('disposisi', 'notify', 'notify INTEGER NOT NULL DEFAULT 0')
  await db.execute('CREATE INDEX IF NOT EXISTS idx_disposisi_parent ON disposisi(parent_id)')

  await ensureColumn('arsip', 'tgl_arsip', 'tgl_arsip TEXT')
  await ensureColumn('arsip', 'alasan_musnah', 'alasan_musnah TEXT')
  await ensureColumn('arsip', 'file_drive_id', 'file_drive_id TEXT')
  await ensureColumn('arsip', 'file_name', 'file_name TEXT')
  await db.execute(`UPDATE arsip SET tgl_arsip = created_at WHERE tgl_arsip IS NULL`)
  await db.execute('CREATE INDEX IF NOT EXISTS idx_arsip_ref_masuk ON arsip(ref_masuk_id)')
  await db.execute('CREATE INDEX IF NOT EXISTS idx_arsip_ref_keluar ON arsip(ref_keluar_id)')

  await ensureColumn('surat_masuk', 'ringkasan', 'ringkasan TEXT')
  await ensureColumn('users', 'google_id', 'google_id TEXT')
  await db.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)')

  await seedAdmin()
}

async function ensureColumn(table: string, column: string, ddl: string) {
  const db = useDb()
  const res = await db.execute(`PRAGMA table_info(${table})`)
  const exists = (res.rows as any[]).some((col) => col.name === column)
  if (!exists) {
    await db.execute(`ALTER TABLE ${table} ADD COLUMN ${ddl}`)
  }
}

async function seedAdmin() {
  const db = useDb()
  const res = await db.execute('SELECT COUNT(*) as c FROM users')
  const count = (res.rows[0] as any).c as number
  if (count > 0) return

  const hash = await bcrypt.hash('admin123', 10)
  await db.execute({
    sql: `INSERT INTO users (nama, username, email, password_hash, role, status)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: ['Administrator', 'admin', 'admin@instansi.local', hash, 'admin', 'active']
  })

  // klasifikasi default
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
}
