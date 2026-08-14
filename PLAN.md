# PLAN.md — Aplikasi Surat Masuk/Keluar + Disposisi + Arsip

## 1. Ringkasan
Aplikasi web manajemen persuratan (satu instansi) dengan:
- Surat Masuk & Surat Keluar (nomor otomatis)
- Disposisi surat (alur antar user by role)
- Manajemen Arsip (klasifikasi + retensi + pencarian)
- Notifikasi in-app, Soft delete/restore, Export laporan, Preview file
- Admin: User Status, Session, Klasifikasi, Log Aktivitas
- File di Dropbox (token app); metadata di Turso

## 2. Stack
- Nuxt 4 (Vue 3 + Nitro) — frontend & API satu repo
- Nuxt UI v4 + Tailwind CSS v4 (CSS-first: @import "tailwindcss"; @import "@nuxt/ui";)
- @libsql/client (Turso, hrana/HTTP)
- Dropbox (token app, akses via fetch ke Dropbox API)
- zod (validasi), bcryptjs (hash)
- exceljs (export Excel); PDF via halaman laporan print-friendly (window.print)
- Package manager: npm | Hosting: Vercel

## 3. Keputusan Desain
- Auth: session cookie httpOnly (`sid`) + tabel `sessions`
- Role: admin | staff_tu | pimpinan
- Nomor otomatis per tahun: `NNN/SM-INST/<Romawi>/<Tahun>`, `NNN/SK-INST/...`
- Soft delete: kolom `deleted_at` di tabel inti (filter IS NULL)
- Semua Turso & Drive hanya dari server (Nitro)

## 4. Struktur Folder (Nuxt 4)
surat/
├─ nuxt.config.ts
├─ app.config.ts
├─ vercel.json
├─ .env.example
├─ app/
│  ├─ assets/css/main.css
│  ├─ layouts/default.vue          # sidebar + navbar + badge notif
│  ├─ pages/
│  │  ├─ login.vue
│  │  ├─ index.vue                 # dashboard
│  │  ├─ search.vue                # pencarian global
│  │  ├─ surat-masuk/index.vue  |  [id].vue
│  │  ├─ surat-keluar/index.vue  |  [id].vue
│  │  ├─ disposisi/index.vue       # inbox disposisi user
│  │  ├─ arsip/index.vue
│  │  ├─ laporan/index.vue         # export PDF/Excel
│  │  └─ admin/
│  │     ├─ users.vue              # User Status Manager
│  │     ├─ sessions.vue           # Session Manager
│  │     ├─ klasifikasi.vue        # CRUD master klasifikasi
│  │     └─ activity.vue           # Log Aktivitas viewer
│  ├─ components/
│  │  ├─ SuratForm.vue | FileUpload.vue | FilePreview.vue
│  │  ├─ DispositionTimeline.vue | NotificationBell.vue
│  │  └─ AppSidebar.vue | ConfirmDialog.vue
│  ├─ composables/useAuth.ts | useNotifications.ts
│  └─ middleware/auth.global.ts
├─ server/
│  ├─ utils/db.ts | drive.ts | session.ts | logger.ts | search.ts
│  ├─ utils/migrate.ts             # tabel + seed admin
│  ├─ middleware/auth.ts           # guard API + cek revoked
│  └─ api/
│     ├─ auth/login.post.ts | logout.post.ts | me.get.ts
│     ├─ surat-masuk/index.{get,post}.ts | [id].{get,put,delete}.ts
│     ├─ surat-keluar/... | disposisi/index.post.ts | [id].get.ts
│     ├─ arsip/... | klasifikasi/... | users/... | sessions/...
│     ├─ activity/index.get.ts | notifications/{index.get,read.post}.ts
│     ├─ search.get.ts | files/[id].get.ts | laporan/export.post.ts
└─ lib/validations.ts

## 5. Skema Database (Turso/SQLite)
users(id, nama, username UNIQUE, email, password_hash, role, status DEFAULT 'active',
      last_login, deleted_at, created_at)
sessions(id, user_id, token, expires_at, ip_address, user_agent, last_active, revoked DEFAULT 0)
klasifikasi(id, kode, nama, deskripsi, retensi_tahun, deleted_at, created_at)
surat_masuk(id, no_agenda, no_urut, no_surat, klasifikasi_id, tgl_surat, tgl_terima,
       pengirim, perihal, sifat, file_drive_id, file_name, created_by, deleted_at, created_at)
surat_keluar(id, no_urut, no_surat, klasifikasi_id, tgl_surat, tujuan, perihal, sifat,
       file_drive_id, file_name, created_by, deleted_at, created_at)
disposisi(id, surat_masuk_id, dari_user_id, kepada_user_id, instruksi, catatan,
       status DEFAULT 'baru', deleted_at, created_at)
arsip(id, ref_masuk_id NULL, ref_keluar_id NULL, klasifikasi_id, nama_dokumen,
       lokasi, tahun, deleted_at, created_at)
notifications(id, user_id, title, message, entity, entity_id, `read` DEFAULT 0, created_at)
activity_log(id, user_id, action, entity, entity_id, detail JSON, ip_address, created_at)

## 6. Auth & Session Manager
- login → bcrypt.compare → INSERT sessions(token, ip, ua) → cookie `sid` httpOnly
- Nitro middleware: cek session belum expired & revoked=0 untuk API terproteksi
- /admin/* hanya role admin
- Session Manager: list sesi (user, IP, UA, last_active) + revoke (set revoked=1 +
  hapus cookie client) → force logout
- User Status: toggle active/inactive, ganti role, buat/nonaktifkan user

## 7. Dropbox (token app)
- NUXT_DROPBOX_TOKEN (token dari Dropbox App, scope files.content.write + files.content.read)
- upload: POST https://content.dropboxapi.com/2/files/upload (path, mode add, autorename) → simpan id file
- download: POST https://content.dropboxapi.com/2/files/download (Dropbox-API-Arg path=id) → stream ke response
- id file Dropbox dipakai sebagai referensi (stabil, bukan path)

## 8. Fitur Ekstra
- Notifikasi: INSERT notifications saat disposisi dibuat ke user tujuan;
  NotificationBell fetch /api/notifications (count unread) + mark read
- Soft delete: DELETE handler set deleted_at; list filter IS NULL; restore = set NULL
- Export: /api/laporan/export (exceljs → .xlsx); halaman laporan print-friendly → PDF (window.print)
- Preview: FilePreview via <iframe>/<img> ke /api/files/[id]?inline=1 (PDF/gambar)
- Pencarian global: /api/search?q= → LIKE di surat_masuk/keluar/arsip by no/perihal/pengirim/tujuan
- Log Aktivitas: logger.ts dipanggil di login, CRUD surat, disposisi, revoke session

## 9. Environment (.env / Vercel)
TURSO_URL= TURSO_AUTH_TOKEN= NUXT_DROPBOX_TOKEN=
SESSION_SECRET= NUXT_SESSION_MAX_AGE=86400

## 10. Vercel
- Preset Nuxt auto-detect
- vercel.json: { "functions": { "api/**": { "maxDuration": 60 } }, "buildCommand": "npm run build" }
- Set env di Vercel (jangan commit .env); naikkan body size Nitro untuk upload besar

## 11. Urutan Implementasi
1. npm create nuxt@latest surat (TypeScript + ESLint)
2. npm i @nuxt/ui tailwindcss @libsql/client zod bcryptjs exceljs
3. config: main.css, app.config.ts, nuxt.config.ts (modules:['@nuxt/ui'], css)
4. db.ts + migrate.ts (semua tabel) + seed admin (admin/admin123, role admin) + jalankan migrasi
5. dropbox.ts + tes upload/download
6. session.ts + logger.ts + auth API + Nitro guard + login + useAuth + layout/navbar
7. CRUD surat masuk/keluar + upload + nomor otomatis + soft delete + preview
8. Disposisi + timeline + notifikasi
9. Klasifikasi master + Arsip (FK klasifikasi, retensi, search)
10. Pencarian global + Dashboard + Laporan (export)
11. Admin: users (status/role), sessions (revoke), klasifikasi, activity log
12. vercel.json + env Vercel + deploy
