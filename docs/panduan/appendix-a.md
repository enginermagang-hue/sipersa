## Appendix A — Alur Kerja per Peran

### Staff

1. Catat Surat Masuk (atau terima)
2. Buat Disposisi ke pimpinan/pelaksana
3. Tulis/Unggah Surat Keluar (draft)
4. Ajukan Persetujuan
5. Setelah terkirim, arsipkan

### Pimpinan

1. Terima disposisi via **Kelola Disposisi** (Disposisi Saya hidden untuk pimpinan, Kelola untuk pimpinan+admin)
2. Proses (ubah status diproses/selesai, teruskan ke bawahan)
3. Setujui/Tolak Surat Keluar di Approval / Dashboard `ApprovalQueue` (`app/pages/index.vue:53` `pimpinan||admin`)
4. Pantau via Dashboard & Kelola Disposisi (Laporan hanya admin & staff)

### Admin
Semua di atas + kelola Users/Sesi/Klasifikasi/Log. Seed awal sudah ada klasifikasi & admin.

**Diagram 4 langkah sederhana:**

1. Pencatatan
2. Pengajuan & Persetujuan
3. Disposisi
4. Tindak Lanjut & Arsip
