## 12. Admin — Khusus Admin

Semua halaman di Admin hanya bisa diakses role admin. Menu Admin terbuka default di sidebar.

### 12.1 Manajemen User

1. **Tabel:** Lihat kolom Nama, NIP, Jabatan, No HP, Username, Role (badge warna), Status (Aktif hijau, Nonaktif abu), Aksi dropdown.

   ![Tabel User — elemen kolom & badge](/panduan/admin-tabel-user.png)

   > *Gambar 24a — Elemen tabel user.*

2. **Search:**
   - Ketik di field Cari “nama, username, email, NIP, jabatan, no HP…” → hasil filter + pagination.

     ![Field Cari User — elemen input pencarian](/panduan/admin-cari-user.png)

     > *Gambar 24b — Elemen field cari user.*

3. **Tambah User:**
   - Klik Tambah User → popup form (nama, username, password wajib) + field email, role, nip, no HP, jabatan.

     ![Form Tambah User — elemen popup](/panduan/admin-form-tambah-user.png)

     > *Gambar 24c — Elemen form tambah user.*

   - Klik Simpan → user baru terbuat.
4. **Edit:**
   - Klik Edit → isi form → ubah role/status/nip/jabatan/no HP → Simpan.
5. **Ubah Status:**
   - Klik toggle → status berubah aktif/nonaktif.
6. **Nonaktifkan:**
   - Klik Nonaktifkan → konfirmasi “Nonaktifkan user ini?” → user menjadi nonaktif. Tidak bisa nonaktifkan diri sendiri.
7. **Dropdown:**
   - Menu Edit, Ubah Status, Nonaktifkan; non-admin hanya Lihat Detail.

![Admin — Users](/panduan/admin-users.png)

> *Gambar 24 — Tabel Manajemen User dengan search, badge role/status, dan aksi dropdown.*

### 12.2 Manajemen Sesi

1. Lihat tabel sesi: user, alamat IP, browser, waktu aktif terakhir, kedaluwarsa, revoked.

   ![Tabel Sesi — elemen daftar sesi](/panduan/admin-tabel-sesi.png)

   > *Gambar 25a — Elemen tabel sesi.*

2. Untuk revoke, klik Revoke → sesi dicabut + force logout user tersebut.
3. Gunakan untuk audit keamanan — cek waktu aktif yang lama.

### 12.3 Klasifikasi

1. **Tabel:** Lihat kolom Kode, Nama, Retensi (tahun, “-” jika tanpa retensi), Aksi.

   ![Tabel Klasifikasi — elemen daftar](/panduan/admin-tabel-klasifikasi.png)

   > *Gambar 25b — Elemen tabel klasifikasi.*

2. **Tambah/Edit:**
   - Klik Tambah → popup form (kode & nama wajib).
   - Klik Edit → ubah field → Simpan.
3. **Hapus:**
   - Klik Hapus → konfirmasi → hapus (jika masih dipakai akan error).
4. **Seed awal:** 4 default (001 Umum, 002 Kepegawaian, 003 Keuangan, 004 Perencanaan, retensi 10 tahun).
5. **Tautan luar Google Sheet:** Tersedia untuk pilih klasifikasi cepat di form surat.

![Admin — Klasifikasi](/panduan/admin-klasifikasi.png)

> *Gambar 25 — Tabel Klasifikasi dengan kode, nama, dan retensi.*

### 12.4 Log Aktivitas

1. Lihat tabel: waktu, user, aksi (buat surat masuk dll), entity, entity_id, detail JSON, alamat IP.

   ![Tabel Log Aktivitas — elemen daftar log](/panduan/admin-log.png)

   > *Gambar 25c — Elemen tabel log aktivitas.*

2. Gunakan filter: entity/action/kata kunci/halaman untuk menyaring.
3. Profil → Aktivitas Saya adalah view personal, sedangkan Admin → Log adalah global.
