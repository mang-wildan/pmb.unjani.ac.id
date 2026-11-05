# Buku Panduan Operasional
# Sistem Informasi PMB UNJANI

**Universitas Jenderal Achmad Yani**
**Versi Aplikasi:** 1.0 · Next.js 16.2.4
**Terakhir Diperbarui:** Mei 2026

---

## Daftar Isi

1. [Pendahuluan](#1-pendahuluan)
2. [Akses & Login](#2-akses--login)
3. [Hierarki Peran & Hak Akses](#3-hierarki-peran--hak-akses)
4. [Tampilan Website Publik](#4-tampilan-website-publik)
5. [Dashboard Admin](#5-dashboard-admin)
6. [Jalur Seleksi](#6-jalur-seleksi)
7. [Jadwal Penerimaan](#7-jadwal-penerimaan)
8. [Biaya Pendidikan](#8-biaya-pendidikan)
9. [Fakultas](#9-fakultas)
10. [Program Studi](#10-program-studi)
11. [Kelas](#11-kelas)
12. [Dokumen (PDF)](#12-dokumen-pdf)
13. [Pengumuman & Berita](#13-pengumuman--berita)
14. [FAQ](#14-faq)
15. [Popup Promosi](#15-popup-promosi)
16. [Halaman (Hero & Konten)](#16-halaman-hero--konten)
17. [Pengaturan Global](#17-pengaturan-global)
18. [Manajemen Pengguna](#18-manajemen-pengguna)
19. [Tips & Praktik Terbaik](#19-tips--praktik-terbaik)
20. [Pemecahan Masalah](#20-pemecahan-masalah)

---

## 1. Pendahuluan

Sistem Informasi PMB UNJANI adalah aplikasi web lengkap yang terdiri dari dua bagian utama:

- **Website Publik** — halaman yang dilihat calon mahasiswa: informasi jalur seleksi, jadwal, biaya pendidikan, dokumen, pengumuman, dan kalkulator PMB.
- **CMS Admin** — panel pengelolaan konten di balik layar, diakses oleh staf PMB yang berwenang.

### Teknologi yang Digunakan

| Komponen | Teknologi |
|----------|-----------|
| Framework | Next.js 16.2.4 (App Router) |
| Bahasa | TypeScript |
| Database | MongoDB (via Mongoose) |
| Styling | Tailwind CSS |
| Autentikasi | JWT (httpOnly Cookie) |
| Server | CentOS 9 + aaPanel + PM2 |

### URL Penting

| URL | Keterangan |
|-----|------------|
| `https://pmb.unjani.ac.id` | Website publik |
| `https://pmb.unjani.ac.id/id/admin/login` | Login admin (Bahasa Indonesia) |
| `https://pmb.unjani.ac.id/en/admin/login` | Login admin (English) |

---

## 2. Akses & Login

### Cara Login

1. Buka browser dan akses `https://pmb.unjani.ac.id/id/admin/login`
2. Masukkan **Email** dan **Password** yang telah diberikan
3. Klik tombol **Masuk**
4. Setelah berhasil, Anda akan diarahkan ke Dashboard Admin

### Keamanan Login

- **Batas percobaan:** 5 kali gagal login dalam 60 detik → akun sementara diblokir
- **Session aktif:** 1 jam (access token), 7 hari (refresh token otomatis)
- **reCAPTCHA:** Aktif jika dikonfigurasi di Pengaturan (mencegah bot)

### Cara Logout

Klik nama pengguna di pojok kanan atas sidebar → pilih **Keluar**.

> Selalu logout jika menggunakan komputer bersama.

### Lupa Password

Hubungi **Superadmin** untuk reset password. Tidak ada fitur "lupa password" mandiri karena alasan keamanan.

---

## 3. Hierarki Peran & Hak Akses

Sistem memiliki tiga tingkat peran pengguna:

### Superadmin
Akses penuh ke seluruh sistem termasuk manajemen pengguna.

### Admin
Akses ke semua konten dan data, kecuali manajemen pengguna.

### Editor
Akses terbatas hanya pada konten yang sering diperbarui (dokumen, pengumuman, FAQ, popup, halaman).

### Tabel Hak Akses Lengkap

| Fitur | Superadmin | Admin | Editor |
|-------|:----------:|:-----:|:------:|
| Dashboard | ✓ | ✓ | ✓ |
| Jalur Seleksi | ✓ | ✓ | — |
| Jadwal | ✓ | ✓ | — |
| Biaya Pendidikan | ✓ | ✓ | — |
| Fakultas | ✓ | ✓ | — |
| Program Studi | ✓ | ✓ | — |
| Kelas | ✓ | ✓ | — |
| Dokumen PDF | ✓ | ✓ | ✓ |
| Pengumuman | ✓ | ✓ | ✓ |
| FAQ | ✓ | ✓ | ✓ |
| Popup Promosi | ✓ | ✓ | ✓ |
| Halaman (Hero) | ✓ | ✓ | ✓ |
| Pengaturan Global | ✓ | ✓ | — |
| Manajemen Pengguna | ✓ | — | — |

> Jika menu tidak tampil, berarti peran Anda tidak memiliki akses ke fitur tersebut.

---

## 4. Tampilan Website Publik

Website publik dapat diakses di `https://pmb.unjani.ac.id`. Berikut bagian-bagian yang ditampilkan kepada calon mahasiswa:

| Bagian | URL | Isi Konten |
|--------|-----|------------|
| Beranda | `/` | Hero slideshow, jalur seleksi, jadwal aktif, dokumen, pengumuman, FAQ, Instagram, popup |
| Jalur Seleksi | `/jalur-seleksi` | Daftar semua jalur seleksi yang aktif |
| Jadwal | `/jadwal` | Timeline jadwal penerimaan |
| Biaya Pendidikan | `/biaya-pendidikan` | Tabel biaya dengan filter |
| Kalkulator PMB | `/kalkulator` | Kalkulator interaktif biaya per prodi/kelas |
| Pengumuman | `/pengumuman` | Daftar berita dan pengumuman |
| Detail Pengumuman | `/pengumuman/[slug]` | Isi lengkap satu pengumuman |
| Manual Book | `/manual-book` | Download panduan pendaftaran (PDF) |
| Kontak | `/kontak` | Informasi kontak dan alamat |

### Catatan Cache (ISR)

Website menggunakan **cache ISR (Incremental Static Regeneration)**. Perubahan konten dari admin akan **terlihat di publik dalam waktu maksimal 60 detik** setelah disimpan — bukan langsung seketika.

---

## 5. Dashboard Admin

Dashboard menampilkan ringkasan statistik sistem:

- Jumlah Jalur Seleksi aktif
- Jumlah Jadwal aktif
- Jumlah Program Studi
- Jumlah Pengumuman aktif
- Jumlah Dokumen terunggah
- Pengguna admin yang terdaftar

Menu navigasi di sisi kiri (sidebar) memberikan akses ke semua modul sesuai peran Anda.

---

## 6. Jalur Seleksi

**Akses:** Admin → Jalur Seleksi
**Peran minimum:** Admin

Jalur Seleksi adalah cara atau metode penerimaan mahasiswa baru (misalnya: Jalur Prestasi, Jalur Reguler, Jalur Beasiswa).

### Menambah Jalur Seleksi Baru

1. Klik tombol **+ Tambah Jalur**
2. Isi formulir berikut:

| Field | Keterangan | Wajib |
|-------|------------|:-----:|
| Nama | Nama jalur dalam Bahasa Indonesia (maks. 120 karakter) | ✓ |
| Nama EN | Nama dalam Bahasa Inggris (opsional) | — |
| Slug | Auto-terisi dari Nama; bisa diedit manual (harus unik) | ✓ |
| Ringkasan | Deskripsi singkat maks. 320 karakter (tampil di kartu) | — |
| Ringkasan EN | Ringkasan dalam Bahasa Inggris | — |
| Deskripsi | Konten lengkap dengan rich text editor (maks. 20.000 karakter) | — |
| Deskripsi EN | Deskripsi dalam Bahasa Inggris | — |
| Persyaratan | Daftar syarat, satu baris satu syarat (maks. 300 karakter/baris) | — |
| Urutan | Angka urutan tampil di halaman publik; lebih kecil = lebih atas (default: 100) | ✓ |
| Badge | Label singkat maks. 30 karakter (contoh: "Baru", "Favorit") | — |
| Aktif | Centang agar tampil di website publik | ✓ |

3. Klik **Simpan**

### Mengedit Jalur Seleksi

1. Klik ikon **edit** (pensil) pada baris yang ingin diubah
2. Ubah field yang diperlukan
3. Klik **Simpan**

### Menonaktifkan Jalur Seleksi

- Unchecklist field **Aktif** → jalur tidak tampil di publik tanpa dihapus
- Berguna saat jalur sedang tidak dibuka tetapi datanya perlu disimpan

### Menghapus Jalur Seleksi

> Perhatikan: menghapus jalur yang sudah terhubung ke Jadwal atau Biaya dapat menyebabkan data tidak konsisten. Pastikan tidak ada jadwal aktif yang menggunakan jalur ini sebelum menghapus.

1. Klik ikon **hapus** (tempat sampah)
2. Konfirmasi penghapusan

---

## 7. Jadwal Penerimaan

**Akses:** Admin → Jadwal
**Peran minimum:** Admin

Jadwal mendefinisikan periode gelombang penerimaan: kapan mulai, kapan selesai, dan jalur seleksi mana yang berlaku.

### Menambah Jadwal

1. Klik **+ Tambah Jadwal**
2. Isi formulir:

| Field | Keterangan | Wajib |
|-------|------------|:-----:|
| Judul | Nama jadwal, contoh: "Pendaftaran Gelombang 1" | ✓ |
| Gelombang Ke | Nomor urut gelombang (angka, minimal 1) | ✓ |
| Tahun Ajaran | Format teks, contoh: "2025/2026" | ✓ |
| Jalur Seleksi | Centang satu atau lebih jalur yang berlaku pada jadwal ini | ✓ |
| Tanggal Mulai | Tanggal pembukaan pendaftaran | ✓ |
| Tanggal Selesai | Tanggal penutupan pendaftaran | ✓ |
| Status Aktif | Centang agar tampil di website publik | ✓ |

3. Klik **Simpan**

> Jadwal yang tanggalnya mencakup hari ini akan otomatis tampil sebagai "Jadwal Aktif" di beranda. Jadwal mendatang tampil sebagai "Segera Dibuka".

### Hubungan Jadwal dengan Biaya

Setiap entri Biaya harus terhubung ke satu Jadwal. Buat Jadwal terlebih dahulu sebelum mengisi data Biaya untuk gelombang tersebut.

---

## 8. Biaya Pendidikan

**Akses:** Admin → Biaya
**Peran minimum:** Admin

Modul ini mengelola biaya pendidikan per kombinasi Program Studi + Jalur Seleksi + Jadwal + Kelas. Data ini digunakan oleh Kalkulator PMB di halaman publik.

### Menambah Data Biaya (Manual)

1. Klik **+ Tambah Biaya**
2. Isi formulir:

| Field | Keterangan | Wajib |
|-------|------------|:-----:|
| Program Studi | Pilih dari dropdown (searchable) | ✓ |
| Jalur Seleksi | Pilih jalur yang berlaku | ✓ |
| Jadwal | Pilih gelombang yang berlaku | ✓ |
| Kelas | Pilih kelas (jika ada perbedaan kelas); kosongkan jika tidak berlaku | — |
| Biaya Masuk | Biaya pendaftaran/masuk (format Rupiah) | ✓ |
| Biaya Per Semester | Biaya kuliah per semester (opsional) | — |
| Biaya Tambahan | Biaya lain seperti seragam, dll. (opsional) | — |
| Persentase Cicilan | Jadwal pembayaran, contoh: "50%, 50%" (pisahkan dengan koma) | — |

3. Klik **Simpan**

### Import Data Biaya dari CSV

Untuk memasukkan banyak data sekaligus:

1. Klik **Unduh Template** untuk mendapatkan format CSV yang benar
2. Buka template di Excel atau Google Sheets
3. Isi data sesuai kolom template:
   - `program_studi` — nama program studi (harus persis sama)
   - `jalur` — nama jalur seleksi
   - `jadwal` — judul jadwal
   - `kelas` — nama kelas (boleh kosong)
   - `biaya` — angka tanpa titik/koma
   - `biaya_per_semester` — opsional
   - `biaya_tambahan` — opsional
4. Simpan sebagai `.csv`
5. Klik **Import** → pilih file → unggah
6. Sistem akan menampilkan laporan: berhasil / baris yang gagal beserta alasannya

### Export Data Biaya

1. Filter berdasarkan **Jadwal** yang ingin diekspor
2. Klik **Export CSV**
3. File CSV akan diunduh otomatis

> Gunakan fitur export untuk backup data atau memindahkan data biaya antar jadwal.

---

## 9. Fakultas

**Akses:** Admin → Fakultas
**Peran minimum:** Admin

Daftar nama-nama fakultas di UNJANI. Data ini digunakan sebagai kelompok Program Studi.

### Menambah Fakultas

1. Klik **+ Tambah Fakultas**
2. Isi:
   - **Nama** — nama lengkap fakultas, contoh: "Fakultas Ekonomi dan Bisnis"
   - **Singkatan** — huruf kapital, contoh: "FEB"
3. Klik **Simpan**

### Import Fakultas dari CSV

1. Klik **Unduh Template**
2. Isi kolom `nama` dan `singkatan`
3. Klik **Import** → pilih file

---

## 10. Program Studi

**Akses:** Admin → Program Studi
**Peran minimum:** Admin

Daftar semua program studi yang tersedia di UNJANI, beserta informasi akreditasi.

### Menambah Program Studi

1. Klik **+ Tambah Program Studi**
2. Isi formulir:

| Field | Keterangan | Wajib |
|-------|------------|:-----:|
| Nama | Nama lengkap program studi | ✓ |
| Singkatan | Huruf kapital, contoh: "SISTEM INFORMASI" | ✓ |
| Jenjang | Pilih: D3 / D4 / S1 / Profesi / S2 / S3 | ✓ |
| Fakultas | Pilih dari daftar fakultas | ✓ |
| Akreditasi | Status akreditasi, contoh: "Unggul", "A", "B" | — |
| File Akreditasi | Upload PDF sertifikat akreditasi (maks. 15 MB) | — |

3. Klik **Simpan**

### Upload Sertifikat Akreditasi

1. Dari daftar program studi, klik ikon **upload** pada baris yang bersangkutan
2. Pilih file PDF sertifikat akreditasi
3. Klik **Unggah**
4. Nama file akan tampil di kolom File Akreditasi

### Import Program Studi dari CSV

Format kolom CSV: `nama`, `singkatan`, `jenjang`, `fakultas`

> Nilai `jenjang` harus salah satu dari: `D3`, `D4`, `S1`, `Profesi`, `S2`, `S3`
> Nilai `fakultas` harus persis sama dengan singkatan/nama fakultas yang sudah ada

---

## 11. Kelas

**Akses:** Admin → Kelas
**Peran minimum:** Admin

Kelas mendefinisikan jenis kelas perkuliahan yang tersedia, contoh: Kelas Reguler, Kelas Malam, Kelas Karyawan.

### Menambah Kelas

1. Klik **+ Tambah Kelas**
2. Isi:
   - **Nama** — nama kelas, contoh: "Kelas Malam"
   - **Singkatan** — huruf kapital, contoh: "MALAM"
3. Klik **Simpan**

> Data Kelas digunakan opsional di Biaya Pendidikan jika ada perbedaan biaya per kelas.

---

## 12. Dokumen (PDF)

**Akses:** Admin → Dokumen
**Peran minimum:** Editor

Modul ini mengelola file PDF yang dapat diunduh oleh publik, seperti brosur biaya dan manual book pendaftaran.

### Mengunggah Dokumen Baru

1. Klik **+ Unggah Dokumen**
2. Isi formulir dan pilih file:

| Field | Keterangan | Wajib |
|-------|------------|:-----:|
| File PDF | File dokumen (hanya PDF, maks. 15 MB) | ✓ |
| Kategori | Pilih: **Biaya** / **Manual Book** / **Lainnya** | ✓ |
| Judul | Nama dokumen yang tampil di publik (maks. 160 karakter) | ✓ |
| Judul EN | Judul dalam Bahasa Inggris (opsional) | — |
| Deskripsi | Keterangan singkat dokumen (maks. 500 karakter) | — |
| Urutan | Urutan tampil; lebih kecil = lebih atas (default: 100) | — |
| Aktif | Centang agar tampil di website publik | ✓ |

3. Klik **Unggah & Simpan**

### Kategori Dokumen

| Kategori | Tampil Di |
|----------|-----------|
| `biaya` | Bagian Biaya di beranda + halaman Biaya Pendidikan |
| `manual-book` | Halaman Manual Book |
| `lainnya` | Tidak tampil otomatis; hanya tersimpan di sistem |

### Membatasan Format File

Sistem hanya menerima file PDF asli. File yang diubah ekstensinya saja (misal `.jpg` diganti `.pdf`) akan **ditolak otomatis** oleh sistem.

### Mengganti atau Memperbarui Dokumen

Sistem tidak mendukung penggantian file in-place. Untuk memperbarui dokumen:
1. Upload dokumen versi baru dengan nama/judul yang sesuai
2. Nonaktifkan atau hapus dokumen lama

---

## 13. Pengumuman & Berita

**Akses:** Admin → Pengumuman
**Peran minimum:** Editor

Modul untuk mengelola berita dan pengumuman resmi PMB yang tampil di beranda dan halaman `/pengumuman`.

### Membuat Pengumuman Baru

1. Klik **+ Tambah Pengumuman**
2. Isi halaman formulir:

**Tab Konten:**

| Field | Keterangan | Wajib |
|-------|------------|:-----:|
| Judul | Judul pengumuman (maks. 160 karakter) | ✓ |
| Judul EN | Judul dalam Bahasa Inggris | — |
| Slug | Auto-terisi dari judul; harus unik (digunakan di URL) | ✓ |
| Ringkasan | Kutipan singkat maks. 320 karakter (tampil di daftar & SEO) | — |
| Ringkasan EN | Ringkasan dalam Bahasa Inggris | — |
| Konten | Isi pengumuman lengkap (rich text editor, maks. 50.000 karakter) | — |
| Konten EN | Versi Bahasa Inggris | — |
| Gambar Cover | Upload gambar header pengumuman (JPEG/PNG/WebP, maks. 5 MB) | — |

**Tab Pengaturan:**

| Field | Keterangan |
|-------|------------|
| Pinned | Centang agar selalu tampil paling atas |
| Tanggal Publikasi | Tanggal dan waktu publikasi (default: sekarang) |
| Aktif | Centang agar tampil di website publik |

**Tab SEO:**

| Field | Keterangan |
|-------|------------|
| Meta Title | Judul untuk mesin pencari (maks. 120 karakter) |
| Meta Description | Deskripsi untuk mesin pencari (maks. 220 karakter) |

3. Klik **Simpan**

### Fitur Rich Text Editor

Editor konten mendukung:
- Heading (H1–H3), paragraf, bold, italic, underline
- Daftar bernomor dan tidak bernomor
- Tautan (link) dengan URL kustom
- Sisipan gambar (via upload gambar)
- Blok kutipan

> Jangan tempel (paste) langsung dari Microsoft Word. Gunakan tombol "Paste as Plain Text" atau bersihkan format terlebih dahulu untuk menghindari HTML kotor.

### Mengelola Pengumuman yang Ada

- **Ikon pensil** → Edit pengumuman
- **Toggle Aktif** → Tampilkan/sembunyikan dari publik tanpa menghapus
- **Pin** → Pinned pengumuman selalu tampil di posisi teratas
- **Ikon hapus** → Hapus permanen (tidak bisa dibatalkan)

---

## 14. FAQ

**Akses:** Admin → FAQ
**Peran minimum:** Editor

Kelola daftar Pertanyaan yang Sering Diajukan (FAQ) yang tampil di bagian bawah beranda.

### Menambah FAQ

1. Klik **+ Tambah FAQ**
2. Isi formulir:

| Field | Keterangan | Wajib |
|-------|------------|:-----:|
| Pertanyaan | Teks pertanyaan dalam Bahasa Indonesia | ✓ |
| Jawaban | Teks jawaban | ✓ |
| Pertanyaan EN | Versi Bahasa Inggris | — |
| Jawaban EN | Jawaban dalam Bahasa Inggris | — |
| Kategori | Pilih: **Teknis** / **Biaya** / **Jadwal** | ✓ |
| Urutan | Urutan tampil dalam kategori (default: 100) | — |
| Aktif | Centang agar tampil di website publik | ✓ |

3. Klik **Simpan**

### Kategori FAQ

FAQ dikelompokkan otomatis berdasarkan kategori di halaman publik:

- **Teknis** — pertanyaan seputar cara daftar, login sistem, teknis pendaftaran
- **Biaya** — pertanyaan seputar biaya, cicilan, beasiswa
- **Jadwal** — pertanyaan seputar waktu/periode pendaftaran

---

## 15. Popup Promosi

**Akses:** Admin → Popup
**Peran minimum:** Editor

Popup adalah jendela overlay yang muncul saat pengunjung pertama kali membuka website. Digunakan untuk informasi penting, promosi, atau pengumuman mendesak.

### Menambah Popup Baru

1. Klik **+ Tambah Popup**
2. Isi formulir:

| Field | Keterangan | Wajib |
|-------|------------|:-----:|
| Gambar | File gambar popup (JPEG/PNG/WebP, maks. 5 MB) | ✓ |
| Judul | Nama/judul internal popup (hanya untuk referensi admin) | ✓ |
| Alt Text | Teks alternatif gambar (untuk aksesibilitas) | — |
| URL Tujuan | Link saat gambar diklik; kosongkan jika tidak perlu link | — |
| Tampil Dari | Tanggal mulai popup tampil (kosongkan = langsung aktif) | — |
| Tampil Sampai | Tanggal berakhir popup (kosongkan = tidak ada batas) | — |
| Sembunyikan Selama | Berapa hari popup tidak muncul lagi setelah pengunjung menutupnya (default: 1 hari) | — |
| Urutan | Prioritas tampil jika ada beberapa popup aktif | — |
| Aktif | Centang untuk mengaktifkan popup | ✓ |

3. Klik **Simpan**

### Tips Popup

- Ukuran gambar yang direkomendasikan: **800 × 600 piksel** atau rasio 4:3
- Maksimal 3 popup aktif secara bersamaan
- Gunakan **Tampil Dari / Sampai** untuk menjadwalkan popup agar tidak perlu manual mengaktifkan/menonaktifkan
- Nilai **Sembunyikan Selama = 0** → popup muncul setiap kali halaman dibuka

---

## 16. Halaman (Hero & Konten)

**Akses:** Admin → Halaman
**Peran minimum:** Editor

Modul ini mengelola konten visual utama beranda, terutama bagian **Hero Slideshow** (banner utama di bagian paling atas website).

### Mengelola Hero Slideshow

#### Menambah Gambar Hero

1. Di bagian **Galeri Hero**, klik **+ Unggah Gambar**
2. Pilih file gambar (JPEG/PNG/WebP, maks. 5 MB)
3. Gambar akan muncul di daftar dan langsung masuk ke slideshow

> Rekomendasi ukuran gambar hero: **1920 × 700 piksel** (landscape/horizontal). Gunakan gambar berkualitas tinggi tapi ukuran file seoptimal mungkin.

#### Menghapus Gambar Hero

1. Hover pada gambar di galeri
2. Klik ikon **hapus** (×) yang muncul
3. Konfirmasi penghapusan

### Mengedit Teks Hero

| Field | Keterangan |
|-------|------------|
| Judul | Teks heading utama yang tampil di atas slideshow |
| Sub Judul | Teks sekunder di bawah judul |
| Tahun Ajaran | Tahun ajaran aktif, contoh: "2025/2026" |

Setelah mengubah, klik **Simpan Perubahan**.

### Informasi Gelombang (Countdown)

Countdown gelombang di beranda ditarik otomatis dari data **Jadwal** yang aktif. Tidak perlu diatur secara terpisah di halaman ini.

---

## 17. Pengaturan Global

**Akses:** Admin → Pengaturan
**Peran minimum:** Admin

Pengaturan global mengontrol identitas situs, informasi kontak, SEO, dan integrasi layanan pihak ketiga. Perubahan di sini berdampak ke seluruh halaman website.

### Identitas Situs

| Field | Keterangan |
|-------|------------|
| Nama Situs | Nama situs yang tampil di title browser (default: "PMB UNJANI") |
| Tagline | Slogan atau moto singkat |
| URL Pendaftaran | Link tombol "Daftar Sekarang" di seluruh halaman |
| Alamat | Alamat kantor PMB (tampil di footer dan halaman kontak) |
| Email | Email kontak PMB |
| Telepon | Nomor telepon |
| WhatsApp | Nomor WhatsApp (digunakan tombol floating WhatsApp) |

### Media Sosial

Untuk menambah akun media sosial baru:
1. Klik **+ Tambah Sosial Media**
2. Isi: **Nama** (contoh: Instagram), **URL** (link profil), **Ikon** (nama ikon)
3. Untuk menghapus, klik tombol silang di baris yang bersangkutan

Akun sosial media tampil di footer website.

### SEO (Search Engine Optimization)

| Field | Keterangan |
|-------|------------|
| Google Analytics ID | ID tracking GA4, format: `G-XXXXXXXXXX` |
| Google Site Verification | Kode verifikasi Google Search Console |
| Default Meta Title | Judul SEO fallback jika halaman tidak punya meta title sendiri |
| Default Meta Description | Deskripsi SEO fallback |
| OG Image | URL gambar untuk preview saat link dibagikan di media sosial |

### Feed Instagram

| Field | Keterangan |
|-------|------------|
| Instagram Access Token | Token API Instagram Graph untuk menampilkan feed di beranda |

> Token Instagram memiliki masa berlaku. Jika feed Instagram tidak muncul di beranda, kemungkinan token sudah kedaluwarsa dan perlu diperbarui.

### reCAPTCHA (Keamanan Login)

| Field | Keterangan |
|-------|------------|
| Aktifkan reCAPTCHA | Toggle on/off verifikasi reCAPTCHA v3 di halaman login |
| Site Key | Kunci publik dari Google reCAPTCHA Console |
| Secret Key | Kunci rahasia dari Google reCAPTCHA Console |

> Dapatkan kunci reCAPTCHA di: `https://www.google.com/recaptcha/admin`

---

## 18. Manajemen Pengguna

**Akses:** Admin → Pengguna
**Peran minimum:** Superadmin

Modul ini hanya bisa diakses oleh **Superadmin**. Digunakan untuk mengelola akun staf yang dapat mengakses CMS admin.

### Daftar Pengguna

Menampilkan semua akun admin dengan informasi:
- Email, Nama, Peran, Status (Aktif/Nonaktif), Terakhir Login

### Membuat Pengguna Baru

1. Klik **+ Tambah Pengguna**
2. Isi formulir:

| Field | Keterangan | Wajib |
|-------|------------|:-----:|
| Email | Alamat email unik (digunakan untuk login) | ✓ |
| Nama | Nama lengkap pengguna | ✓ |
| Password | Minimal 8 karakter; disimpan terenkripsi | ✓ |
| Peran | Pilih: superadmin / admin / editor | ✓ |
| Aktif | Centang agar pengguna bisa login | ✓ |

3. Klik **Simpan**

> Berikan password sementara yang kuat, lalu minta pengguna menggantinya sesegera mungkin.

### Mengedit Pengguna

Hal yang dapat diubah:
- **Nama** pengguna
- **Peran** (promote/demote)
- **Status Aktif** — nonaktifkan untuk mencabut akses tanpa menghapus akun
- **Reset Password** — masukkan password baru

### Menonaktifkan Pengguna

Jika ada staf yang sudah tidak bertugas:
1. Klik ikon edit pada akun tersebut
2. Unchecklist **Aktif**
3. Klik **Simpan**

Akun tidak bisa login lagi, tetapi data audit log tetap terjaga.

### Menghapus Pengguna

> Penghapusan bersifat permanen. Pastikan pengguna memang sudah tidak diperlukan.

1. Klik ikon hapus pada baris pengguna
2. Konfirmasi penghapusan

---

## 19. Tips & Praktik Terbaik

### Urutan Pengisian Data Awal

Saat pertama kali mengisi data sistem (setup awal), ikuti urutan berikut agar tidak ada referensi yang hilang:

```
1. Fakultas
2. Program Studi (membutuhkan Fakultas)
3. Kelas
4. Jalur Seleksi
5. Jadwal (membutuhkan Jalur Seleksi)
6. Biaya (membutuhkan Program Studi + Jalur + Jadwal + Kelas)
7. Dokumen, Pengumuman, FAQ, Popup (tidak bergantung urutan)
8. Pengaturan Global
9. Halaman (Hero)
```

### Konvensi Penamaan

| Jenis Data | Contoh Baik | Contoh Buruk |
|------------|-------------|--------------|
| Jalur Seleksi | "Jalur Beasiswa Prestasi" | "jalur 1" |
| Jadwal | "Pendaftaran Gelombang 1 – 2025/2026" | "Gelombang 1" |
| Kelas | "Kelas Reguler Pagi" | "Kelas A" |
| Singkatan Prodi | "SISTEM INFORMASI" | "si" |

### Pengelolaan Gambar

- **Hero banner:** 1920 × 700 px, format WebP lebih direkomendasikan (ukuran lebih kecil)
- **Popup:** 800 × 600 px, rasio 4:3
- **Cover pengumuman:** 1200 × 630 px (standar Open Graph)
- Kompres gambar sebelum upload menggunakan tools seperti [Squoosh](https://squoosh.app) atau TinyPNG

### Pengelolaan Dokumen PDF

- Kompres PDF besar sebelum upload (gunakan tools seperti IlovePDF)
- Gunakan nama file yang deskriptif sebelum upload karena nama asli disimpan di sistem
- Selalu nonaktifkan dokumen lama saat mengunggah versi baru (jangan langsung hapus)

### Pengelolaan Data Biaya

- Selalu **buat Jadwal terlebih dahulu** sebelum mengisi data Biaya untuk gelombang baru
- Gunakan fitur **Export** untuk backup data biaya gelombang sebelumnya
- Gunakan fitur **Import CSV** untuk efisiensi pengisian banyak data sekaligus

### Bahasa (Bilingual)

Website mendukung dua bahasa (Indonesia dan Inggris). Field dengan akhiran `_en` adalah versi Inggris dan bersifat **opsional**. Jika tidak diisi, website akan menampilkan versi Indonesia sebagai fallback.

---

## 20. Pemecahan Masalah

### Perubahan Tidak Muncul di Website Publik

**Penyebab:** Cache ISR belum kedaluwarsa.
**Solusi:** Tunggu hingga 60 detik. Jika lebih dari 5 menit belum berubah, minta admin server untuk restart PM2.

---

### Login Gagal Terus-menerus

| Pesan Error | Solusi |
|-------------|--------|
| "Email atau password salah" | Periksa huruf kapital, coba reset password via superadmin |
| "Terlalu banyak percobaan" | Tunggu 60 detik, coba lagi |
| "Akun tidak aktif" | Hubungi superadmin untuk mengaktifkan akun |
| Halaman login tidak muncul | Cek koneksi internet; coba clear cache browser |

---

### Upload File Gagal

| Pesan Error | Penyebab | Solusi |
|-------------|----------|--------|
| "File melebihi ukuran maksimum" | File PDF > 15 MB atau gambar > 5 MB | Kompres file terlebih dahulu |
| "Hanya file PDF yang diperbolehkan" | File bukan PDF asli atau ekstensi diubah | Pastikan file benar-benar PDF |
| "Hanya JPEG, PNG, atau WebP" | Format gambar tidak didukung | Konversi ke JPEG, PNG, atau WebP |
| Upload stuck / tidak ada respon | Koneksi lambat atau timeout | Coba lagi dengan koneksi lebih stabil |

---

### Slug Duplikat

**Pesan:** "Slug sudah digunakan"
**Solusi:** Sistem otomatis generate slug unik. Jika tetap gagal, edit field slug secara manual dengan menambahkan suffix, contoh: `jalur-beasiswa-2` → `jalur-beasiswa-2025`.

---

### Tabel / Data Kosong di Admin

**Kemungkinan penyebab:**
1. Belum ada data yang dimasukkan → mulai dari awal dengan menambah data
2. Filter aktif yang menyembunyikan data → hapus filter
3. Koneksi database bermasalah → hubungi admin teknis

---

### Feed Instagram Tidak Muncul

**Penyebab:** Token Instagram kedaluwarsa (masa berlaku 60 hari).
**Solusi:**
1. Login ke Meta Developer Console
2. Perbarui/refresh token Instagram
3. Masukkan token baru di **Pengaturan → Instagram Access Token**
4. Simpan

---

### Menu Tidak Muncul di Sidebar

**Penyebab:** Peran akun Anda tidak memiliki izin untuk menu tersebut.
**Solusi:** Hubungi superadmin untuk upgrade peran jika memang diperlukan.

---

### Tidak Bisa Hapus Jalur Seleksi / Jadwal

**Penyebab:** Data masih direferensikan oleh entitas lain (misalnya Biaya atau Jadwal masih menggunakan Jalur tersebut).
**Solusi:**
1. Hapus atau ubah referensi di data yang tergantung terlebih dahulu
2. Baru hapus data induknya

---

## Kontak Tim Teknis

Jika mengalami masalah teknis yang tidak tercakup dalam panduan ini, hubungi:

- **Tim IT UNJANI** — `dev@unjani.ac.id`
- **Dokumentasi teknis** — lihat file `README.md` di folder proyek

---

*Buku Panduan ini mencakup seluruh fitur operasional CMS PMB UNJANI per Mei 2026.*
*Untuk perubahan fitur di versi mendatang, dokumen ini perlu diperbarui.*
