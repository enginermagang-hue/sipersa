## 8. Arsip

### 8.1 Daftar Arsip

Header “Arsip — Kelola arsip dan retensi dokumen” + Export Excel & Tambah (tersembunyi jika mode Terhapus).

**KPI retensi** (dihitung dari retensi klasifikasi + tgl buat vs sekarang):

| Status | Arti | Warna |
|--------|------|-------|
| Aktif | sisa >1 tahun | hijau |
| Menjelang | 0 < sisa ≤1 tahun | kuning |
| Kadaluarsa | sisa ≤0 | merah |
| Tetap | tanpa retensi | netral |

![KPI Retensi — elemen kartu status arsip](/panduan/arsip-kpi.png)

> *Gambar 16a — Elemen KPI retensi.*

**Toolbar:** Cari dokumen/lokasi, toggle Terhapus (hanya admin bisa restore), filter status retensi, sumber (Dari Surat Masuk/Keluar/Mandiri), tahun, popup filter di mobile.

![Toolbar Arsip — elemen filter & toggle Terhapus](/panduan/arsip-toolbar.png)

> *Gambar 16b — Elemen toolbar arsip.*

**Tabel:** Kolom Dokumen, Klasifikasi (kode - nama), Lokasi, Tahun, Sumber (link ke surat asal jika ada, else “-”), Retensi (badge + sisa tahun), File (Unduh + Preview), Aksi.

![Arsip — Daftar](/panduan/arsip-list.png)

> *Gambar 16 — Daftar arsip dengan KPI retensi dan filter sumber.*

**Pagination & Empty:** Tabel “Belum ada data” + angka halaman.

### 8.2 Tambah & Edit Arsip

1. Klik Tambah → popup form terbuka.

   ![Tombol Tambah Arsip — elemen di header](/panduan/arsip-tombol-tambah.png)

   > *Gambar 16c — Elemen tombol Tambah.*

2. Isi field:
   - Nama dokumen wajib, lokasi, tahun, sifat (biasa/segera/rahasia/penting), klasifikasi (opsional), taut surat masuk/keluar (opsional), file opsional → Dropbox Arsip.

   ![Form Tambah Arsip — elemen field](/panduan/arsip-form-field.png)

   > *Gambar 16d — Elemen form tambah arsip.*

3. Klik Simpan.
4. Untuk Edit, buka arsip → Edit → ubah field → Simpan (hanya pemilik/admin).

   **Arsip otomatis:** Saat surat masuk/keluar diarsipkan manual, isi taut surat agar kolom Sumber terhubung.

### 8.3 Hapus, Restore, Pemusnahan

1. **Hapus:**
   - Klik dropdown Aksi → Hapus → konfirmasi → hilang dari list normal.

   ![Dropdown Aksi Arsip — elemen Hapus](/panduan/arsip-aksi-hapus.png)

   > *Gambar 16e — Elemen dropdown Aksi.*

2. **Restore:**
   - Aktifkan toggle Terhapus ON (hanya admin) → tombol Restore muncul → klik Restore.

   ![Toggle Terhapus — elemen switch](/panduan/arsip-toggle-terhapus.png)

   > *Gambar 16f — Elemen toggle Terhapus.*

3. **Pemusnahan:**
   - Jika status kadaluarsa, klik aksi Pemusnahan (ikon api) → isi alasan → klik Musnahkan. Tombol hanya untuk kadaluarsa.

![Arsip — Pemusnahan](/panduan/arsip-destroy.png)

> *Gambar 17 — Modal Pemusnahan arsip kadaluarsa dengan alasan.*

**Preview:**

1. Klik tombol mata → popup preview file.

   ![Tombol Preview — elemen ikon mata](/panduan/arsip-preview.png)

   > *Gambar 17a — Elemen tombol preview.*

**Export:**

1. Klik Export → file terunduh.
