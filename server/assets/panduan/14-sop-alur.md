## Appendix D — SOP Alur Lengkap

Gambar SOP horizontal satu halaman: dari **Surat Masuk & Disposisi** hingga **Surat Keluar & Arsip**, lengkap dengan kop logo instansi. Berlaku untuk peran Staff, Pimpinan, dan Admin.

[![SOP Alur Lengkap SIPERSA](/sop-alur-lengkap.svg)](/sop-alur-lengkap.png)

> *Gambar 1 — SOP alur lengkap SIPERSA (horizontal, kiri → kanan). Klik gambar untuk membuka versi PNG resolusi penuh.*

**Unduhan:**

- [Versi PNG (2480×1432)](/sop-alur-lengkap.png) — untuk cetak & presentasi
- [Versi SVG](/sop-alur-lengkap.svg) — vektor, bisa diperbesar tanpa pecah

### Cara membaca gambar

1. Mulai dari kolom **1 · AKSES** (login → dashboard per peran), alur mengalir ke kanan. Warna panah: abu-abu = alur normal, biru = buat/ajukan, hijau = YA/setuju, merah = TIDAK/tolak.
2. Kolom **2 · SURAT MASUK** khusus Staff: catat → nomor otomatis → notifikasi pimpinan.
3. Kolom **3 · DISPOSISI**: pimpinan membuat disposisi → staff memproses → teruskan berantai → selesaikan. Cabang hijau **selesai langsung**: staff boleh menyelesaikan tanpa meneruskan.
4. Kolom **4 · SURAT KELUAR**: staff menulis draft → **ajukan** → submit. Sistem menolak bila isi/file belum lengkap (**isi kurang → lengkapi**). Pimpinan memutuskan: **YA, setujui** (terkirim) atau **TIDAK, tolak + catatan** → revisi (panah biru kembali ke draft).
5. Kolom **5 · ARSIP & LAPORAN**: surat yang selesai/terkirim diarsipkan (1 surat = 1 arsip), lalu laporan & kelola sistem.

### Sumber & regenerasi

- Sumber Mermaid (editable): `docs/sop-alur-lengkap.mmd`
- Generator SVG: `scripts/sop-render.py` → `python scripts/sop-render.py`
- PNG diekspor dari SVG pada resolusi 2480×1432.
