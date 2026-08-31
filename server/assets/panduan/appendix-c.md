## Appendix C — Referensi Teknis untuk Admin IT

**Pengaturan penting** (file .env):

- Database: kosong = pakai file lokal .data/local.db, isi URL jika pakai Turso.
- Dropbox: gunakan App Key/Secret/Refresh Token (mode offline dianjurkan).
- Google Login: Client ID, Secret, dan Redirect URI.
- Sesi: durasi sesi (default 1 hari).
- Instansi: nama, unit, sub unit, alamat, path logo, nomor TU/unit.
- WA: token, aktif/nonaktif, URL API.
- Nama aplikasi.

![File .env — elemen pengaturan di editor](/panduan/appendix-env.png)

> *Gambar H — Contoh file pengaturan .env.*

**Deploy:**

- Build command: nuxt build (auto-detect di Vercel). Durasi fungsi atur di Dashboard Vercel.

  ![Vercel Dashboard — elemen pengaturan deploy](/panduan/appendix-vercel.png)

  > *Gambar H1 — Elemen dashboard Vercel.*

**Migrasi Database:**

- Otomatis saat start — buat tabel jika belum ada & seed admin. Perubahan skema tambah di file migrasi.

**Keamanan:**

- Setiap endpoint API (kecuali login & Google) cek sesi login yang valid.

> **Akhir Panduan** — Jika menemukan bug atau butuh fitur tambahan, catat di Log Aktivitas lalu hubungi admin. Selamat menggunakan SIPERSA!
