## 2. Akses & Login

### 2.1 Login dengan Username / NIP dan Password

1. Buka halaman Login.
2. Isi Username / NIP dan Password (keduanya wajib diisi).
3. Klik Masuk. Jika berhasil, toast “Berhasil masuk” muncul dan Anda diarahkan ke Dashboard.

   ![Toast berhasil masuk — elemen notifikasi setelah klik Masuk](/panduan/akses-login-toast-berhasil.png)

   > *Gambar 2a — Toast “Berhasil masuk” setelah login berhasil.*

4. Akun bawaan awal: username admin / password admin123 (role admin). Segera ganti password setelah login pertama.

![Halaman Login](/panduan/login-01.png)

> *Gambar 2 — Form login SIPERSA: field Username/NIP, Password dengan toggle mata, tombol Masuk, serta opsi Login Google dan Login SSO ASN.*

**Tips:**

- Centang Ingat saya agar sesi tidak cepat habis (default 1 hari).
- Jika muncul error “Username atau password salah”, periksa Caps Lock dan hubungi admin untuk reset.

  ![Validasi field wajib diisi — elemen pesan error di bawah field](/panduan/akses-login-field-validasi.png)

  > *Gambar 2b — Pesan validasi saat field wajib belum diisi.*

### 2.2 Login dengan Google

1. Di halaman login, klik Login Google.

   ![Tombol Login Google — elemen tombol di halaman login](/panduan/akses-login-tombol-google.png)

   > *Gambar 3a — Tombol Login Google.*

2. Setelah consent Google, browser kembali ke aplikasi dan sesi dibuat otomatis, lalu redirect ke Dashboard.
3. Hanya email terdaftar yang bisa masuk. Email tidak dikenal akan kembali ke halaman login dengan pesan “Akun Google tidak terdaftar” (tidak auto-create user).

| Kode error | Arti | Warna toast |
|------------|------|-------------|
| google-config | Login Google belum dikonfigurasi | merah |
| google-cancelled | User batal di halaman Google | netral |
| google-unregistered | Email Google tidak terdaftar | kuning |
| google-inactive | Akun nonaktif | kuning |
| google | Gagal umum | merah |

![Login Google](/panduan/login-google.png)

> *Gambar 3 — Contoh pesan error Login Google.*

### 2.3 SSO ASN

Tombol Login Google & SSO ASN memiliki animasi hover halus. Tombol Login SSO ASN saat ini menampilkan toast “SSO belum tersedia — masih dalam pengembangan”. Abaikan untuk operasional harian.

### 2.4 Lupa Password & Ganti Password

1. Di halaman login, klik Lupa password? → toast “Hubungi admin untuk mereset password Anda.” — tidak ada reset mandiri.
2. Setelah login, buka Profil → Keamanan → Ganti Password.

   ![Form Ganti Password — elemen modal di Profil](/panduan/akses-login-ganti-password.png)

   > *Gambar 3b — Form Ganti Password di menu Profil.*

   - Isi password baru dan konfirmasi.
   - Klik Simpan.
3. Admin juga bisa reset password user via Admin → Users → Edit → Password Baru.

### 2.5 Logout & Sesi

1. Klik avatar di footer sidebar → Keluar.

   ![Menu avatar → Keluar — elemen dropdown di sidebar](/panduan/akses-login-avatar-keluar.png)

   > *Gambar 3c — Menu avatar dengan opsi Keluar.*

2. Sesi disimpan dengan alamat IP, browser, waktu aktif terakhir, dan status. Token adalah kode acak, bukan tanda tangan.
3. Modal Logout kini tanpa judul — hanya body "Sedang keluar…" dengan spinner.
3. Jika sesi dicabut admin, Anda akan otomatis logout saat akses berikutnya.
