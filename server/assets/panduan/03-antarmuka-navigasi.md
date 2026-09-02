## 3. Antarmuka & Navigasi

### 3.1 Layout Utama

Tata letak aplikasi terdiri dari sidebar, navbar, dan area konten.

| Area | Isi |
|------|-----|
| Sidebar header | Logo dan nama aplikasi |
| Sidebar body | Tombol Cari (Ctrl/Cmd+K) dan menu navigasi 4 grup |
| Sidebar footer | Avatar dan menu (Profil, Tentang, Keluar) |
| Navbar | Tombol mode gelap/terang, lonceng notifikasi, aksi cepat (+) |
| Konten | Area utama + footer versi & copyright |
| Modal Cari | Popup pencarian → ketik lalu Enter |
| Modal Logout | Loading “Sedang keluar…” |

![Layout SIPERSA](/panduan/layout-01.png)

> *Gambar 4 — Sidebar kiri (Dashboard, Surat Masuk, Surat Keluar, Disposisi, Arsip, Laporan, Kelola Disposisi, Admin, Tentang), navbar atas dengan lonceng notifikasi dan tombol +.*

![Elemen sidebar header — logo dan nama aplikasi](/panduan/antarmuka-sidebar-header.png)

> *Gambar 4a — Elemen header sidebar.*

### 3.2 Menu Navigasi per Peran

- **Semua peran:** Dashboard, Surat Masuk, Surat Keluar (badge “menunggu persetujuan” hanya pimpinan), Arsip, Tentang, Panduan.
- **Khusus admin & staff:** Disposisi (inbox, badge disposisi saya) & Laporan.
- **Khusus pimpinan & admin:** Kelola Disposisi.
- **Khusus admin:** Grup Admin → Users, Session, Log Aktivitas, Klasifikasi.

  ![Grup Admin di sidebar — elemen menu Admin](/panduan/antarmuka-grup-admin.png)

  > *Gambar 4b — Grup menu Admin.*

### 3.3 Pencarian Cepat

1. Tekan Ctrl+K atau Cmd+K untuk buka popup cari.

   ![Popup Cari Cepat — elemen modal pencarian](/panduan/antarmuka-popup-cari.png)

   > *Gambar 4c — Popup pencarian cepat.*

2. Ketik kata kunci → Enter → ke halaman Pencarian.
3. Alternatif: tombol Cari di sidebar atau field cari di tiap halaman daftar.

### 3.4 Notifikasi

Notifikasi muncul di lonceng navbar. Badge angka menunjukkan yang belum dibaca. Notifikasi dibuat otomatis saat disposisi baru ditujukan ke Anda. Di header panel notifikasi ada tombol **X Tutup** (kanan atas, `aria-label="Tutup notifikasi"` di `app/components/NotificationBell.vue:90`) — klik untuk menutup tanpa mark read.

![Lonceng notifikasi — elemen badge di navbar](/panduan/antarmuka-notifikasi.png)

> *Gambar 4d — Elemen lonceng notifikasi dengan badge.*

### 3.5 Aksi Cepat

Tombol + di navbar & Aksi Cepat Dashboard — hanya muncul jika berhak: Surat Masuk Baru & Surat Keluar Baru (hanya staff), Arsip Baru (admin & staff). Pimpinan tidak melihat Aksi Cepat (`app/layouts/default.vue:102`, `app/pages/index.vue:7`).

![Tombol Aksi Cepat (+) — elemen di navbar](/panduan/antarmuka-aksi-cepat.png)

> *Gambar 4e — Elemen tombol Aksi Cepat.*

### 3.6 Tema Gelap/Terang

Tombol mode gelap/terang di navbar. Halaman login juga punya switch gelap/terang.

![Switch Tema — elemen tombol mode](/panduan/antarmuka-tema.png)

> *Gambar 4f — Elemen switch tema.*
