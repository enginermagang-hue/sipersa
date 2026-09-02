## 4. Dashboard

### 4.1 Header

- Sapaan “Selamat datang, Nama” di bagian atas.
- Filter Periode (3/6/9/12 Bulan) dan Klasifikasi — header responsif `flex-col sm:flex-row` (`app/pages/index.vue:17`): stack vertikal di mobile, horizontal di sm+.

  ![Filter Periode & Klasifikasi — elemen di header dashboard](/panduan/dashboard-filter.png)

  > *Gambar 5a — Elemen filter periode dan klasifikasi.*

- Tombol Refresh (berputar saat memuat), dan menu Aksi Cepat — **hidden untuk pimpinan** (return `[]` di `app/pages/index.vue:7`, `v-if="aksiItems.length"`). Hanya staff/admin melihat dropdown Zap.

![Dashboard header](/panduan/dashboard-01.png)

> *Gambar 5 — Header dashboard dengan filter periode & klasifikasi.*

### 4.2 Kartu KPI (8 kartu)

Grid 2 baris (mobile 2 kartu + expand).

| Kartu | Link |
|-------|------|
| Surat Masuk | Surat Masuk |
| Surat Keluar | Surat Keluar |
| Arsip | Arsip |
| Disposisi Saya | Disposisi |
| Disposisi Lewat | Disposisi |
| Masuk Hari Ini | Surat Masuk |
| Keluar Pending | Surat Keluar |
| Arsip Bulan Ini | Arsip |

Warna ikon: biru, hijau, kuning, ungu, merah, biru muda, oranye, abu.

![Dashboard KPI](/panduan/dashboard-kpi.png)

> *Gambar 6 — Delapan kartu KPI dengan ikon bulat berwarna.*

### 4.3 Grafik & Ringkasan

- Trend 12 bulan: garis masuk vs keluar.
- Status Disposisi (baru/diproses/selesai/lewat).
- Disposisi Pending — daftar perlu tindakan.
- Surat Masuk Terbaru.
- Approval Queue (hanya pimpinan/admin) — surat keluar menunggu persetujuan.
- Klasifikasi Arsip — diagram.
- Aktivitas Terbaru — dari log aktivitas.
- Batas Waktu Disposisi — yang mendekati lewat.

![Grafik Dashboard — elemen trend dan donut](/panduan/dashboard-grafik.png)

> *Gambar 6a — Elemen grafik trend dan donut klasifikasi.*

Semua widget menampilkan loading skeleton saat memuat.
