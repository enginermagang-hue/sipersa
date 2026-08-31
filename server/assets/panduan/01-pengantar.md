## 1. Pengantar SIPERSA

**SIPERSA** adalah aplikasi manajemen persuratan terpadu satu instansi untuk mengelola **Surat Masuk, Surat Keluar, Disposisi, dan Arsip** secara teraudit.

**Karakter utama:**

- Penomoran otomatis per tahun — Masuk NNN/SM-INST/Romawi/Tahun, Keluar KODE/NNN/TU/tekkomdik/Romawi/Tahun.
- Soft delete — data yang dihapus masih tersimpan dan bisa dipulihkan, tidak hilang permanen.
- Audit trail — setiap aksi penting (login, tambah/ubah/hapus surat, disposisi) tercatat di log aktivitas.
- Upload file — lampiran disimpan di Dropbox (folder Surat Masuk, Surat Keluar, Arsip, Tanda Tangan) dengan ID file yang stabil.

**Siapa pengguna?**

| Peran | Akses utama |
|-------|-------------|
| admin | Kelola user, klasifikasi, sesi, log aktivitas |
| staff_tu | Operasional harian surat & arsip, ajukan surat keluar |
| pimpinan | Persetujuan surat keluar, disposisi & kelola disposisi |

Semua pengguna yang sudah login bisa membaca panduan ini.

![Gambaran aplikasi SIPERSA](/panduan/tentang-hero.png)

> *Gambar 1 — Halaman Tentang, ringkasan fitur & alur kerja 4 langkah (Pencatatan → Pengajuan & Persetujuan → Disposisi → Tindak Lanjut & Arsip).*
