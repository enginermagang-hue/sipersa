## 6. Surat Keluar

### 6.1 Daftar Surat Keluar

Serupa Surat Masuk tapi KPI berbeda:

- Total Surat Keluar
- Draft & Ditolak
- Menunggu Persetujuan
- Terkirim Bulan Ini

  ![KPI Surat Keluar — elemen kartu ringkas](/panduan/surat-keluar-kpi.png)

  > *Gambar 10a — Elemen KPI surat keluar.*

Filter: status (Draft/Menunggu Persetujuan/Ditolak/Terkirim/Selesai), sifat, bulan. Badge warna: draft netral, menunggu kuning, ditolak merah, terkirim hijau, selesai biru.

![Surat Keluar — Daftar](/panduan/surat-keluar-list.png)

> *Gambar 10 — Daftar surat keluar dengan filter status dan badge warna.*

**Membuat surat:**

1. Jika staff:
   - Buka dropdown Buat Surat Keluar → pilih Unggah Surat atau Tulis Surat (editor).

     ![Dropdown Buat Surat Keluar — elemen pilihan Unggah/Tulis](/panduan/surat-keluar-dropdown-buat.png)

     > *Gambar 10b — Elemen dropdown Buat.*

2. Jika peran lain:
   - Klik Tambah Surat Keluar → langsung buka popup unggah.

### 6.2 Tulis Surat (Editor)

1. Pilih Klasifikasi (wajib).

   ![Select Klasifikasi — elemen dropdown di form tulis](/panduan/surat-keluar-klasifikasi.png)

   > *Gambar 11a — Elemen pilih klasifikasi.*

2. Isi tgl surat, tujuan, perihal, sifat (default biasa), penandatangan, dan tulis isi di editor.

   ![Field Tulis Surat — elemen input tujuan/perihal](/panduan/surat-keluar-field-tulis.png)

   > *Gambar 11b — Elemen field tujuan & perihal.*

   ![Editor Isi Surat — elemen TinyMCE dengan kop](/panduan/surat-keluar-editor.png)

   > *Gambar 11c — Elemen editor isi surat.*

3. Klik Simpan → status menjadi draft (file akan dibuat saat approve jika perlu).
4. Setelah simpan, lanjutkan ke pengajuan persetujuan.

![Tulis Surat Keluar](/panduan/surat-keluar-tulis.png)

> *Gambar 11 — Editor untuk menulis surat keluar.*

**Unggah Surat:**

Popup unggah mirip surat masuk tapi field tujuan/perihal/klasifikasi wajib, file langsung ke Dropbox Surat Keluar, status draft.

![Popup Unggah Surat Keluar — elemen form unggah](/panduan/surat-keluar-unggah.png)

> *Gambar 11d — Elemen popup unggah.*

### 6.3 Alur Persetujuan (Approval)

1. **Dari draft** → Staff klik Ajukan Persetujuan → status menjadi menunggu persetujuan → muncul di antrian pimpinan.

   ![Tombol Ajukan Persetujuan — elemen di detail](/panduan/surat-keluar-ajukan.png)

   > *Gambar 12a — Elemen tombol Ajukan.*

2. **Menunggu persetujuan → Setujui** → Pimpinan klik Setujui → status menjadi terkirim → surat terbit, file PDF dibuat jika tulis, tanda tangan ditempel jika ada.

   ![Tombol Setujui/Tolak — elemen di detail pimpinan](/panduan/surat-keluar-setujui.png)

   > *Gambar 12b — Elemen tombol Setujui & Tolak.*

3. **Menunggu persetujuan → Tolak** → Pimpinan klik Tolak + isi catatan → status menjadi ditolak → staff bisa edit & ajukan ulang.

Hanya admin atau pemilik yang bisa edit/hapus, tapi approve hanya pimpinan/admin.

![Approval Surat Keluar](/panduan/surat-keluar-approval.png)

> *Gambar 12 — Detail surat keluar dengan tombol Ajukan, Setujui, Tolak, dan riwayat approval.*

### 6.4 Tanda Tangan Digital

1. Buka Profil → Tanda Tangan Digital. Hanya pimpinan atau staff.

   ![Card Tanda Tangan Digital — elemen di Profil](/panduan/surat-keluar-ttd-card.png)

   > *Gambar 12c — Elemen card tanda tangan.*

2. Siapkan file PNG/JPG rasio 2:1, maks 2 MB.

   ![Area Upload TTD — elemen pilih gambar](/panduan/surat-keluar-ttd-upload.png)

   > *Gambar 12d — Elemen upload tanda tangan.*

3. Klik Pilih Gambar Tanda Tangan → Upload → simpan ke folder Tanda Tangan.
   - Preview akan muncul setelah upload.
4. Saat pimpinan approve surat tulis, tanda tangan penandatangan otomatis ditempel ke PDF.

### 6.5 Detail, Edit, Hapus, Export

1. **Detail:** Buka halaman detail — lihat kop, isi HTML, status timeline, preview/unduh file, tombol aksi sesuai status.

   ![Timeline Status — elemen di detail surat keluar](/panduan/surat-keluar-timeline.png)

   > *Gambar 12e — Elemen timeline status.*

2. **Edit:** Buka halaman edit atau popup (hanya jika draft/ditolak & pemilik/admin) → simpan perubahan.
3. **Hapus:** Klik Hapus di dropdown → soft delete.
4. **Export:** Klik Export → file terunduh.
