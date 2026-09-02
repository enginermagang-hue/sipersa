## 5. Surat Masuk

### 5.1 Daftar Surat Masuk

Header: judul “Surat Masuk — Kelola dan pantau semua surat masuk instansi” + Export Excel (semua) & Tambah Surat Masuk (**hanya staff**, `v-if="canCreateMasuk"` di `app/pages/surat-masuk/index.vue:8,139`; pimpinan read-only).

**KPI ringkas (4 kartu):** Total Surat Masuk, Baru (3 Hari), Belum Disposisi, Didisposisi Bulan Ini.

![KPI Surat Masuk — elemen 4 kartu ringkas](/panduan/surat-masuk-kpi.png)

> *Gambar 7a — Elemen KPI ringkas di atas daftar.*

**Toolbar:**

1. Field Cari “no. surat, pengirim, perihal…”.

   ![Field Cari — elemen input pencarian](/panduan/surat-masuk-cari.png)

   > *Gambar 7b — Elemen field pencarian.*

2. Tombol Filter — filter status (Baru/Diproses/Selesai), sifat (Biasa/Segera/Rahasia/Penting), bulan. Badge jumlah filter, tombol reset.
3. Switch view tabel/grid/ringkas (disimpan lokal).

![Surat Masuk — Daftar](/panduan/surat-masuk-list.png)

> *Gambar 7 — Daftar surat masuk dengan toolbar cari, filter, dan switch view.*

**Tabel:** Kolom No. Surat (dengan ikon arsip), Tgl Surat, Pengirim (+ klasifikasi), Perihal (+ badge sifat), Disposisi (badge baru/diproses/selesai), Aksi (dropdown). Klik baris → halaman detail. Jika kosong “Belum ada data”.

**Grid & Ringkas:** Card 3 kolom atau list ringkas, interaksi sama.

**Pagination:** Angka halaman + pilih per halaman 10/20/50 + teks “Menampilkan X–Y dari Z”.

![Pagination — elemen navigasi halaman](/panduan/surat-masuk-pagination.png)

> *Gambar 7c — Elemen pagination.*

### 5.2 Tambah Surat Masuk

1. Klik Tambah Surat Masuk → popup form terbuka.

   ![Tombol Tambah Surat Masuk — elemen tombol di header](/panduan/surat-masuk-tombol-tambah.png)

   > *Gambar 8a — Elemen tombol Tambah.*

2. Isi field berikut:

   | Field | Wajib | Keterangan |
   |-------|-------|------------|
   | Tgl Surat | Ya | Tanggal pada naskah surat |
   | Tgl Terima | Ya | Tanggal diterima instansi |
   | Pengirim | Ya | Instansi/pengirim |
   | Perihal | Ya | Judul/perihal surat |
   | Sifat | Tidak | biasa/segera/rahasia/penting (default biasa) |
   | Status | Tidak | diterima/didisposisikan/ditindaklanjuti/selesai |
   | Klasifikasi | Tidak | Pilih dari master Klasifikasi |
   | No Agenda | Tidak | Jika kosong, auto-generate |
   | File lampiran | Tidak | PDF/Gambar → Dropbox Surat Masuk |

   ![Form Tambah Surat Masuk — elemen field di popup](/panduan/surat-masuk-form-field.png)

   > *Gambar 8b — Elemen field di form tambah.*

3. Unggah lampiran jika ada (opsional).

   ![Upload lampiran — elemen area upload file](/panduan/surat-masuk-upload.png)

   > *Gambar 8c — Elemen upload lampiran.*

4. Klik Simpan.

   ![Toast Berhasil — elemen notifikasi setelah simpan](/panduan/surat-masuk-toast-berhasil.png)

   > *Gambar 8d — Toast “Surat masuk berhasil ditambahkan”.*

![Tambah Surat Masuk](/panduan/surat-masuk-tambah.png)

> *Gambar 8 — Form Tambah Surat Masuk.*

**Hak akses:** Hanya role **staff** yang melihat tombol Tambah Surat Masuk (server `POST /api/surat-masuk` 403 untuk non-staff di `server/api/surat-masuk/index.post.ts:10`). Edit/hapus tetap hanya admin atau pemilik (`canManage`).

### 5.3 Edit & Hapus

1. **Edit:**
   - Di dropdown Aksi → Edit → popup sama terbuka.
   - Ubah field yang perlu, ganti file jika perlu.
   - Klik Perbarui.
2. **Hapus:**
   - Di dropdown Aksi → Hapus → konfirmasi “Hapus Surat ...?” → soft delete (tidak hilang permanen, bisa dipulihkan admin).

   ![Dropdown Aksi — elemen menu Edit/Hapus](/panduan/surat-masuk-aksi-dropdown.png)

   > *Gambar 8e — Elemen dropdown Aksi di tabel.*

### 5.4 Detail Surat Masuk

Halaman detail menampilkan header surat, badge sifat/status, tombol Unduh, Edit/Hapus (jika berhak), preview file (PDF/gambar), timeline disposisi, dan lembar disposisi untuk cetak.

![Detail Surat Masuk](/panduan/surat-masuk-detail.png)

> *Gambar 9 — Halaman detail surat masuk.*

![Preview File — elemen viewer PDF/gambar](/panduan/surat-masuk-preview.png)

> *Gambar 9a — Elemen preview file.*

### 5.5 Disposisi dari Surat Masuk

1. Di halaman detail, buka form Teruskan Disposisi.

   ![Form Teruskan Disposisi — elemen di detail surat](/panduan/surat-masuk-form-disposisi.png)

   > *Gambar 9b — Elemen form Teruskan Disposisi.*

2. Isi field:
   - Penerima — pilih satu atau beberapa penerima.
   - Instruksi — pilih instruksi dan catatan tambahan.
   - Sifat disposisi — biasa / segera / sangat_segera / rahasia.
   - Batas waktu — pilih tanggal (opsional).
   - Centang notify jika ingin kirim WA.
3. Klik Kirim → disposisi dibuat per penerima, notifikasi terkirim, status surat menjadi didisposisikan.

### 5.6 Export Excel

1. Di toolbar daftar, klik Export Excel.

   ![Tombol Export Excel — elemen di toolbar](/panduan/surat-masuk-export.png)

   > *Gambar 9c — Elemen tombol Export.*

2. File Excel otomatis terunduh dengan filter yang sama dengan list.
