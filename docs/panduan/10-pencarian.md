## 10. Pencarian Global

1. Akses via popup tekan Ctrl+K / Cmd+K atau langsung buka /search?q=kata. **Rentang Waktu kini UPopover + UCalendar range picker** (`app/pages/search.vue:19-66`): tombol `Semua waktu` → popover dengan kalender 1 bulan (mobile) / 2 bulan (desktop), preset Hari ini/7/30hari/Tahun + Hapus, badge rentang aktif. API tetap `date_from/date_to` YYYY-MM-DD.

   ![Popup Pencarian — elemen modal Ctrl+K](/panduan/pencarian-popup.png)

   > *Gambar 21a — Elemen popup pencarian cepat.*

2. Ketik kata kunci di field → hasil cari di no surat/perihal/pengirim (surat masuk), no surat/perihal/tujuan (surat keluar), nama dokumen/lokasi (arsip). Judul di card sudah di-`stripHtml` (tag `<p>` tidak tampil, `server/api/search.get.ts` + `app/pages/search.vue:139` + highlight `<mark>` via `v-html`).

   ![Field Pencarian — elemen input di halaman Search](/panduan/pencarian-field.png)

   > *Gambar 21b — Elemen field pencarian global.*

3. Lihat hasil yang dikelompokkan per jenis → klik untuk ke halaman detail.

![Pencarian Global](/panduan/search-global.png)

> *Gambar 21 — Halaman pencarian global dengan hasil kelompok Surat Masuk/Keluar/Arsip.*
