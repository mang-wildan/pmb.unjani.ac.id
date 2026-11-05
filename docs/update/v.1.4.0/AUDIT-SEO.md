# Audit SEO: pmb.unjani.ac.id (5 November 2026)

**Situs:** https://pmb.unjani.ac.id (Penerimaan Mahasiswa Baru, Universitas Jenderal Achmad Yani)
**Tanggal audit:** 5 November 2026
**Metode:** seluruh data diambil lewat Firecrawl API. Tes key berhasil (HTTP 200), lalu `/v1/map` dan `/v1/scrape` per URL dengan format markdown, html, rawHtml, dan links. Lokasi scrape Indonesia (`country: ID`, `id-ID`) dengan `maxAge: 0` (tanpa cache).
**Data mentah:** `/tmp/claude-0/-home-user/87da3837-48c0-5393-b396-851afcd325d2/scratchpad/re/raw/`

---

## 1. Ringkasan Eksekutif

### Skor Kesehatan SEO: **53/100** (perlu banyak perbaikan)

| Area | Skor | Inti masalah |
|---|---|---|
| Technical SEO | 57 | HTTP tidak dialihkan ke HTTPS, `www` dialihkan ke HTTP, 38 URL lama 404 tanpa redirect |
| On-page SEO | 42 | Title beranda "PMB UNJANI" (10 karakter). 3 dari 6 keyword utama hampir tidak muncul |
| Konten | 48 | Semua info inti ada di satu halaman. Biaya hanya di PDF, kalkulator kosong, pengumuman beranda masih 2026/2027 |
| Internal linking | 50 | Kedalaman klik dangkal, tapi menu memakai anchor `#`. Artikel tanpa link kontekstual |
| Structured data | 45 | Logo schema 404. Tidak ada FAQPage dan Event. Author bertipe Person |
| Broken links | 56 | Domain ujian `exam.pmb` tidak ada, `exam-pmb` 503, format link WhatsApp salah |
| Visibilitas AI search | 41 | Biaya ada di PDF yang diblokir robots.txt, counter rusak, belum ada llms.txt |

**Gambaran besar.** Fondasi teknis Next.js sudah cukup baik: canonical self-referencing, hreflang id/en, `index, follow`, sitemap valid, 1 H1 per halaman, alt text lengkap, dan halaman 404 yang benar. Masalah terbesarnya ada di **arsitektur informasi**. Ke-14 jalur masuk, jadwal, biaya, 48 program studi, dan FAQ semuanya berada di beranda sebagai anchor (`/#jalur`, `/#kalkulator`), jadi tidak ada URL yang bisa bersaing untuk "jalur masuk unjani", "biaya kuliah unjani", atau "kuliah di cimahi". Kompetitor Telkom University punya halaman terpisah untuk setiap niat pencarian itu. Unpas baru saja menulis "PMB UNPAS 2027 … biaya kuliah" di meta berandanya.

**3 tindakan paling berdampak:**
1. Redirect 301 dari `http://` dan `www.` ke `https://pmb.unjani.ac.id`, dan redirect 301 atau 410 untuk 38 URL lama yang 404.
2. Pecah beranda menjadi halaman `/biaya-kuliah`, `/jalur-masuk`, `/program-studi`, `/jadwal`, dan `/faq`.
3. Ganti title dan meta beranda dengan keyword "PMB UNJANI 2027/2028", "pendaftaran", dan "Cimahi".

### Cakupan data
| Item | Jumlah |
|---|---|
| URL ditemukan `/v1/map` | 48 |
| URL dicek (map ∪ sitemap ∪ daftar URL warisan yang sudah diketahui) | 63 |
| Halaman status 200 | 24 (12 ID + 12 EN) |
| URL status 404 | 38 (15 host `www.`, 19 `/feed`, 3 halaman uji, 1 `/desain-utama/page/2`) |
| Gagal di-scrape | 0 |
| URL di sitemap.xml | 24 |
| Pemeriksaan teknis tambahan | 14 URL (http/www, 404, trailing slash, llms.txt, logo, OG image, subdomain ujian, portal, PDF biaya) |
| Kompetitor | Unpas, Telkom University, UNIKOM (Unisba: situs PMB berhenti) |

### Batasan
- **Core Web Vitals tidak diukur.** Firecrawl tidak menyediakan LCP, INP, atau CLS, jadi yang dilaporkan hanya sinyal dari HTML. Verifikasi di PageSpeed Insights atau Search Console.
- **Header HTTP tidak tersedia**, sehingga jenis redirect (301/302) dan HSTS tidak terlihat. Yang terlihat hanya URL akhir dan status akhir.
- `/v1/map` hanya menampilkan sebagian URL warisan. Daftar lengkap URL 404 di indeks Google perlu dicek di laporan Pages di Search Console.

---

## 2. Temuan per Prioritas

### 🔴 KRITIS

#### K1. HTTP tidak dialihkan ke HTTPS, dan `www` dialihkan ke HTTP
- **Halaman:** seluruh situs.
- **Bukti:**
  - `http://pmb.unjani.ac.id` menghasilkan status 200 dengan URL akhir `http://pmb.unjani.ac.id/`. Artinya halaman tersaji lewat HTTP tanpa redirect, dan HTML-nya memuat 64 referensi `http://` untuk CSS/JS.
  - `https://www.pmb.unjani.ac.id` berakhir di `http://pmb.unjani.ac.id/`, artinya dialihkan **turun ke HTTP**.
  - Canonical di versi HTTP sudah menunjuk ke `https://pmb.unjani.ac.id/`, tetapi ini hanya sinyal, bukan pengganti redirect.
- **Dampak:** host terduplikasi (http, https, www), sinyal ranking terpecah, dan browser menampilkan peringatan "Not secure" kepada calon mahasiswa dan orang tua.
- **Perbaikan:**
  1. Buat redirect 301 `http://pmb.unjani.ac.id/*` → `https://pmb.unjani.ac.id/$1`.
  2. Buat redirect 301 `http(s)://www.pmb.unjani.ac.id/*` → `https://pmb.unjani.ac.id/$1` dalam satu hop.
  3. Aktifkan header `Strict-Transport-Security: max-age=31536000; includeSubDomains`.
  4. Set `metadataBase`/URL situs di Next.js ke `https://pmb.unjani.ac.id` dan hormati `X-Forwarded-Proto`.

#### K2. Konten inti tidak punya URL sendiri
- **Halaman:** `https://pmb.unjani.ac.id/`
- **Bukti:**
  - Navigasi di semua halaman hanya berupa anchor: `Buku Panduan → /#manual-book`, `Jalur Pendaftaran → /#jalur`, `Biaya Pendidikan → /#kalkulator`.
  - Beranda menampung 4.098 kata: 14 jalur seleksi, 2 periode jadwal, 48 prodi di 11 fakultas, dan 11 FAQ, semuanya di bawah satu title.
  - Sitemap (24 URL) hanya berisi beranda, `/pengumuman`, `/artikel`, `/kontak`, 3 pengumuman, dan 5 artikel (×2 bahasa).
- **Dampak:** hanya satu URL yang bisa diperingkat untuk semua niat pencarian, tanpa title, H1, atau meta khusus per topik.
- **Perbaikan:**

| URL baru | Target keyword | Isi |
|---|---|---|
| `/biaya-kuliah` | biaya kuliah unjani | Tabel HTML biaya per prodi, kelas, dan jalur, plus estimasi per semester |
| `/jalur-masuk` + `/jalur-masuk/{pmdk, rapor, cbt-usm, utbk-tka, bakti-negeri, prestasi-akademik, rpl, pindahan, kerjasama, joint-degree, magister, profesi, spesialis, kip-kuliah}` | jalur masuk unjani, pmdk unjani | Perbandingan jalur, syarat, biaya pendaftaran, dan jadwal per jalur |
| `/program-studi` + `/program-studi/{slug}` | jurusan unjani, [prodi] unjani | Jenjang, akreditasi, kampus, biaya, dan prospek kerja |
| `/jadwal` | jadwal pmb unjani 2027 | Semua periode dan gelombang |
| `/faq` | pertanyaan pmb unjani | 11 FAQ yang ada + FAQPage schema |
| `/kuliah-di-cimahi` | kuliah di cimahi | Lokasi, akses, kos, kampus Cimahi vs Bandung |

#### K3. 38 URL lama mengembalikan 404 tanpa redirect
- **Bukti (Firecrawl):**
  - **15 URL di host `www.`** dialihkan ke `http://pmb.unjani.ac.id/…` lalu berakhir 404. Di antaranya URL bertopik PMB: `/faq`, `/prodi`, `/infomasi-biaya`, `/semuajalur`, `/jalur-ods`, `/jalur-pmdk-3`, `/jalur-lanjutan`, `/jalur-magister`, dan `/jadwal-pmb-september`. Sisanya artikel blog lama, misalnya `/ketika-gen-z-mendobrak-stereotype-akuntan-kuno` dan `/arsitektur-microservices-kenapa-sih-penting`.
  - **19 URL feed WordPress** (`/…/feed`, `/tag/…/feed`) berstatus 404. Contohnya `/tips-menghadapi-seleksi-substantif-ppg-prajabatan/feed` dan `/pemilu-serentak-efektivitas-dan-tantangannya/feed`.
  - **3 halaman uji** berstatus 404: `/pengumuman/pengumuman-uji-sitemap-20260807`, `/en/pengumuman/pengumuman-uji-aktif`, `/en/pengumuman/pengumuman-uji-sitemap-20260807`.
  - **1 URL arsip:** `/desain-utama/page/2` (404).
- **Dampak:** backlink dan otoritas lama hilang, dan URL bertopik keyword utama justru 404.
- **Perbaikan:**

| URL lama | Tindakan |
|---|---|
| `/faq` | 301 → `/faq` (baru) |
| `/prodi` | 301 → `/program-studi` |
| `/infomasi-biaya` | 301 → `/biaya-kuliah` |
| `/semuajalur`, `/jalur-lanjutan` | 301 → `/jalur-masuk`, `/jalur-masuk/rpl` |
| `/jalur-pmdk-3`, `/jalur-magister` | 301 → `/jalur-masuk/pmdk`, `/jalur-masuk/magister` |
| `/jalur-ods` | 301 → `/pengumuman/mekanisme-ods` |
| `/jadwal-pmb-september` | 301 → `/jadwal` |
| Artikel blog lama tanpa padanan | 410 (atau 301 ke `/artikel`) |
| `*/feed`, `/tag/*`, `/desain-utama/*`, `/pengumuman/pengumuman-uji-*` | 410 Gone (gunakan aturan pola) |

Sebelum halaman baru dari K2 tersedia, arahkan sementara ke anchor beranda yang setara (`/#jalur`, `/#kalkulator`).

#### K4. Info biaya hanya di PDF yang diblokir robots.txt, sementara kalkulator kosong
- **Halaman:** `https://pmb.unjani.ac.id/#kalkulator`, `https://pmb.unjani.ac.id/api/files/6a6975b0a90c243b4d2c618e`
- **Bukti:**
  - Kalkulator di beranda bertuliskan: *"Biaya pendidikan sedang disusun … akan diumumkan di halaman ini."* Padahal tombol hero di atas fold berbunyi "Hitung Biaya".
  - Data biaya lengkap ada di PDF "BIAYA PENDIDIKAN UNJANI TAHUN 2026" (status 200). Metadata judul PDF masih "RINCIAN BIAYA TAHUN 2026.xlsx".
  - `robots.txt` berisi `Disallow: /api`, sehingga PDF biaya dan buku panduan di `/api/files/…` **tidak bisa dirayapi** mesin pencari.
  - Keyword "biaya kuliah unjani" muncul **0 kali** di seluruh halaman.
- **Dampak:** query dengan niat tertinggi ("biaya kuliah") tidak punya halaman yang bisa diperingkat, dan tombol "Hitung Biaya" mengecewakan pengunjung.
- **Perbaikan:**
  - Terbitkan `/biaya-kuliah` dengan tabel HTML dari data Excel yang sama.
  - Pindahkan PDF publik ke path yang bisa dirayapi (misalnya `/dokumen/biaya-pendidikan-unjani-2026.pdf`) dan perbaiki metadata judulnya.
  - Sampai biaya 2027/2028 final, tampilkan biaya 2026 dengan label "acuan".

---

### 🟠 PENTING

#### P1. Title dan meta beranda lemah
- **Bukti:**
  - `<title>PMB UNJANI</title>` (10 karakter), identik di `/en`.
  - Meta description sepanjang 160 karakter, berbahasa Indonesia, juga dipakai di `/en`.
  - Jumlah kemunculan keyword di beranda: "pmb unjani" 11, "universitas jenderal achmad yani" 6, "pendaftaran unjani" **0**, "kuliah di cimahi" **0**, "jalur masuk unjani" **0**, "biaya kuliah unjani" **0**.
  - Di seluruh halaman ID: "pendaftaran unjani" 2 kali, "jalur masuk unjani" 1 kali (hanya dari tag artikel), "kuliah di cimahi" dan "biaya kuliah unjani" 0 kali.
- **Perbaikan:**
  - Title: `PMB UNJANI 2027/2028 – Pendaftaran Kuliah di Cimahi & Bandung`
  - Description: `Pendaftaran mahasiswa baru Universitas Jenderal Achmad Yani (UNJANI) 2027/2028 dibuka. Cek 14 jalur masuk, biaya kuliah, jadwal, dan daftar online.`
  - Untuk `/en`, gunakan title dan description berbahasa Inggris.

#### P2. Struktur heading beranda
- **Bukti:** beranda punya 1 H1, 9 H2, 30 H3, dan 59 H4. **12 H3 berbunyi sama persis: "Persyaratan"**, sementara nama jalur tidak dijadikan heading. Pertanyaan FAQ juga tidak memakai heading. Deskripsi setiap jalur muncul dua kali di DOM.
- **Perbaikan:** jadikan `<h3>Jalur PMDK UNJANI</h3>` diikuti `<h4>Persyaratan Jalur PMDK</h4>`. Jadikan setiap pertanyaan FAQ sebuah `<h3>`. Render deskripsi jalur cukup satu kali.

#### P3. Counter statistik terbaca sebagai angka acak
- **Bukti:** markdown beranda berisi `Fakultas-233511` dan `Program Studi-1019148`. Penyebabnya, angka animasi tertangkap di tengah animasi, berdampingan dengan nilai asli (11 fakultas, 48 prodi).
- **Dampak:** crawler dan AI bisa mengutip angka yang salah.
- **Perbaikan:** render angka final di SSR. Animasi cukup visual (`aria-hidden`), tidak sebagai teks.

#### P4. Versi `/en` dan hreflang
- **Bukti:**
  - hreflang hanya `id` dan `en`, **tanpa `x-default`**.
  - Sebagian halaman `/en` memakai title dan description berbahasa Indonesia, misalnya `/en/pengumuman/mekanisme-ods` ("Mekanisme One Day Services (ODS)…" / "Mekanisme Kelulusan One Day Services") dan `/en/pengumuman/pembukaan-pmb-2026-2027`.
  - Isi pengumuman `/en` juga sama dengan versi ID.
- **Perbaikan:**
  - Tambahkan `hreflang="x-default"` ke `https://pmb.unjani.ac.id/`.
  - Halaman `/en` yang belum diterjemahkan diberi `noindex` atau dikeluarkan dari sitemap dan hreflang.
  - Jangan mengalihkan pengunjung ke `/en` secara otomatis berdasarkan bahasa browser.

#### P5. Broken link dan link bermasalah
| Link | Ditemukan di | Bukti Firecrawl | Perbaikan |
|---|---|---|---|
| `https://exam.pmb.unjani.ac.id/` | Beranda, Jalur RPL ("Tes Kebidanan … di https://exam.pmb.unjani.ac.id/") | **DNS resolution failed** | Ganti ke `https://exam-pmb.unjani.ac.id/` |
| `https://exam-pmb.unjani.ac.id/` | Beranda (Jalur CBT/USM, FAQ) | **503 Service Temporarily Unavailable** | Tampilkan halaman info saat tidak ada ujian |
| `https://wa.me/08112497890` | `/kontak`, `/en/kontak` (3×) | Format tidak valid untuk wa.me (wajib pakai kode negara) | `https://wa.me/628112497890` |
| `https://pmb.unjani.ac.id/logo.svg` | JSON-LD di semua halaman | **404** | Arahkan ke file logo PNG yang ada |
| `http://pendaftaran.unjani.ac.id/` | Beranda, `/artikel`, dan artikel promo (4×) | Link HTTP | `https://pendaftaran.unjani.ac.id/register` |
| `http://s.unjani.ac.id/bukuperaturanakademik` | Beranda (Jalur Pindahan) | Dialihkan ke `http://baa.unjani.ac.id/…/PERATURAN-AKADEMIK-2021.pdf`, lalu **403** ("Tunggu sebentar…", kemungkinan bot challenge) | Tautkan ke URL HTTPS final. Verifikasi manual |

Link yang sehat: `https://pendaftaran.unjani.ac.id/register` (200) dan `https://unjani.ac.id/` (→ `https://www.unjani.ac.id/`, 200). Tautan media sosial dan Maps tidak di-scrape.

#### P6. Konten kedaluwarsa di beranda
- **Bukti:**
  - Hero dan jadwal sudah 2027/2028: "Periode PMDK 2027" berlangsung 08 Okt 2026 – 02 Jan 2027, dan "Apoteker Genap 2026/2027 Gelombang 1" berlangsung 22 Okt – 27 Nov 2026.
  - Namun blok **Pengumuman** di beranda masih menampilkan "Pengumuman Pembukaan Gelombang 6 TA. 2026/2027", "Mekanisme One Day Services (ODS)", dan "Pendaftaran PMB UNJANI Tahun Akademik 2026/2027 Dibuka".
  - Artikel `/artikel/pendaftaran-gelombang-6-…-202` membahas pendaftaran "26 Juli hingga 29 Agustus 2026" dan dikategorikan "Beasiswa".
- **Perbaikan:**
  - Terbitkan pengumuman resmi PMB 2027/2028.
  - Beri label "Ditutup" pada pengumuman dan artikel lama, dan tautkan ke info terbaru.
  - Jadikan `/jadwal` halaman evergreen.

#### P7. Artikel "PMB UNJANI 2027/2028: PMDK 1 & Gelombang 1 Dibuka" belum dioptimalkan
- **Halaman:** `https://pmb.unjani.ac.id/artikel/pmb-unjani-20272028-pmdk-1-and-gelombang-1-dibuka` (terbit 4 November 2026, 565 kata, 2 inlink)

| Masalah | Bukti | Perbaikan |
|---|---|---|
| Slug | `20272028` (tahun digabung) dan `and` (dari "&") | `/artikel/pmb-unjani-2027-2028-pmdk-1-gelombang-1-dibuka`, lalu 301 dari slug lama |
| Meta description | 71 karakter | 140–160 karakter yang memuat tanggal, jalur, dan kata "Cimahi" |
| Title dan H1 kapital semua | "PMB UNJANI 2027/2028 : PMDK 1 & GELOMBANG 1 DIBUKA!" | Gunakan sentence case |
| Fakta minim | Hanya menyebut tanggal mulai 8 Oktober 2026. Tidak ada tanggal penutupan (2 Jan 2027 menurut beranda), syarat, biaya pendaftaran PMDK (Rp200.000), maupun daftar prodi | Tambahkan tabel jadwal, syarat, dan biaya |
| Tanpa link internal di badan teks | "https://pmb.unjani.ac.id" ditulis sebagai teks biasa. Link yang ada hanya kategori dan 7 tag `?tag=…` | Tautkan ke jalur PMDK, kalkulator biaya, buku panduan, dan portal pendaftaran |
| Schema tidak konsisten | `datePublished 2026-11-04T06:00:00Z`, padahal `dateModified 2026-11-04T05:34:37Z` lebih awal. Author `Person: "WIT X ADMISI"` | Set `dateModified ≥ datePublished`, author bertipe Organization |
| Kategori tidak cocok | Label "Pendaftaran", tetapi link `?kategori=kuliah-di-unjani` | Samakan slug dan label kategori |

#### P8. Structured data
- **Bukti:**
  - Semua halaman memuat `CollegeOrUniversity` dengan `logo: https://pmb.unjani.ac.id/logo.svg` (**404**). Schema ini tanpa address, contactPoint, dan sosial media.
  - `/kontak` memuat `CollegeOrUniversity` dua kali.
  - Artikel memakai `author` bertipe Person ("PMB UNJANI", "WIT X ADMISI").
  - **FAQPage dan Event: 0** di seluruh situs.
- **Perbaikan:** lihat bagian 4.

#### P9. Performa (sinyal dari HTML, belum diukur)
- **Bukti:**
  - Hero image di beranda: `src="/_next/image?url=%2Fpmb%20unjani.jpg&w=3840&q=75"` tanpa `sizes` dan tanpa `fetchpriority="high"` (0 elemen dengan atribut itu).
  - HTML beranda berukuran ±352 KB, dengan 15 chunk JS.
  - Ada elemen popup gambar di beranda.
- **Perbaikan:**
  - Gunakan `<Image fill priority sizes="100vw">` untuk hero, dan kompres sumbernya ke WebP/AVIF.
  - Pindahkan detail 48 prodi dan 14 jalur ke halaman terpisah (K2) agar HTML beranda lebih kecil.
  - Pastikan popup tidak menutupi konten di mobile.
  - Ukur hasilnya di PageSpeed Insights.

#### P10. Kontradiksi dan celah konten
- FAQ menyebut "**12 pilihan jalur** … Kemitraan … KIP-K", padahal halaman menampilkan **14 jalur** tanpa jalur Kemitraan maupun KIP-K.
- Beasiswa, prospek kerja, fasilitas, dan info kos/akses kampus Cimahi tidak dibahas.

---

### 🟡 PERBAIKAN KECIL

| # | Temuan | Bukti | Perbaikan |
|---|---|---|---|
| M1 | Slug tidak deskriptif | `/artikel/tes` untuk artikel voucher UNJANI17AN | Slug deskriptif + 301 |
| M2 | Slug terpotong | `…-29-agustus-202`, `…-hingga-rp275-` | Potong slug per kata |
| M3 | Title artikel terlalu panjang | 96–102 karakter (`/artikel/tes`, `/artikel/spesial-…`, `/artikel/pendaftaran-gelombang-6-…`) | ≤60 karakter sebelum sufiks merek |
| M4 | Meta description artikel 200 karakter (terpotong) | 3 artikel di atas | 140–160 karakter, ditulis manual |
| M5 | Meta description terlalu pendek | `/pengumuman/mekanisme-ods` (36), `/pengumuman` (41), `/kontak` (56), `/artikel` (56) | 120–160 karakter |
| M6 | Kategori salah | Artikel voucher dan Gelombang 6 berkategori "Beasiswa" (`?kategori=bsw`) | Ganti ke "Pendaftaran/Promo" |
| M7 | Nama penulis | "Super Admin PMB", "WIT X ADMISI" | Gunakan nama tim yang jelas |
| M8 | Artikel nyaris yatim | `/artikel/kuliah-di-unjani-…` dan `/artikel/tes`: masing-masing hanya 1 inlink | Tautkan dari beranda dan artikel terkait |
| M9 | Anchor generik | "Baca selengkapnya →", "Lihat"/"Unduh" | Gunakan anchor deskriptif |
| M10 | Halaman kontak tipis (176 kata) | Tanpa telepon kantor dan jam layanan | Tambahkan NAP lengkap per kampus |
| M11 | Salah ketik | `?text=…Universtas Jenderal Achmad Yani` di link WA | "Universitas" |
| M12 | robots.txt memakai `Host:` | Direktif khusus Yandex | Boleh dihapus |
| M13 | Halaman tag berbasis query | `/artikel?tag=…`, `/artikel?kategori=…` | Canonical ke `/artikel` atau `noindex` |
| M14 | `llms.txt` belum ada | `/llms.txt` → 404 | Buat (lihat bagian 6) |
| M15 | Sertifikat akreditasi hanya untuk 1 prodi | Hanya Ilmu Hukum S-1 | Lengkapi untuk semua prodi |

### ✅ Yang sudah baik
- 1 H1 di setiap halaman, dan 0 gambar tanpa alt.
- Canonical self-referencing, `robots: index, follow`, dan `html lang` sudah benar.
- hreflang id/en berlaku dua arah.
- Halaman 404 mengembalikan status 404 sungguhan, dan `/kontak/` dinormalisasi ke `/kontak`.
- robots.txt dan sitemap.xml valid (status 200). Sitemap memuat artikel terbaru dengan `lastmod`.
- Open Graph dan Twitter Card lengkap, dan `og-default.png` berstatus 200.
- Konten persyaratan jalur sangat detail, sehingga bahan untuk halaman-halaman baru sudah tersedia.
- Sudah ada artikel untuk siklus 2027/2028.

---

## 3. Konten dan Internal Linking

| Halaman | Kata | Catatan |
|---|---|---|
| `/` | 4.098 | Padat, tetapi semua topik bercampur di satu URL |
| `/artikel/kuliah-di-unjani-…` | 827 | Generik, tanpa fakta spesifik dan tanpa link internal |
| `/artikel/pmb-unjani-20272028-…` | 565 | Relevan dan baru, tetapi fakta minim (P7) |
| `/pengumuman/gelombang-6` | 397 | Kedaluwarsa |
| `/artikel/pendaftaran-gelombang-6-…`, `/artikel/spesial-…`, `/artikel/tes` | 301–396 | Promo dan pendaftaran yang sudah lewat |
| `/pengumuman/mekanisme-ods`, `/pengumuman/pembukaan-…` | 201–210 | Thin content |
| `/kontak` | 176 | Thin |

**Celah konten:** tabel biaya per prodi (HTML), perbandingan jalur, halaman per prodi, beasiswa dan KIP-Kuliah, kuliah di Cimahi (akses, kos, biaya hidup), pembagian prodi antara kampus Cimahi dan Bandung, nilai rapor minimum per prodi, cara daftar langkah demi langkah, testimoni dan alumni, serta info untuk orang tua.

**Internal linking:**
- Semua halaman bisa dicapai ≤2 klik dari beranda.
- Halaman artikel menerima 1–2 inlink.
- Menu ke `/#jalur`, `/#kalkulator`, dan `/#manual-book` tidak mengalirkan ekuitas link ke halaman topik.
- Tidak ada artikel yang menaruh link kontekstual di badan teks.

---

## 4. Rekomendasi JSON-LD

> FAQ rich result di Google kini terbatas pada situs pemerintah dan kesehatan. FAQPage tetap disarankan karena membantu mesin dan AI memahami konten. Event hanya untuk kegiatan nyata (ujian CBT, briefing, campus tour), bukan untuk "periode pendaftaran".

**CollegeOrUniversity (semua halaman):**
```json
{
  "@context": "https://schema.org",
  "@type": "CollegeOrUniversity",
  "@id": "https://pmb.unjani.ac.id/#organization",
  "name": "Universitas Jenderal Achmad Yani",
  "alternateName": ["UNJANI", "PMB UNJANI"],
  "url": "https://www.unjani.ac.id/",
  "logo": "https://pmb.unjani.ac.id/logo-pmb-unjani.png",
  "email": "admisi@unjani.ac.id",
  "address": {"@type": "PostalAddress", "streetAddress": "Jl. Terusan Jenderal Sudirman, Cibeber, Cimahi Selatan", "addressLocality": "Cimahi", "addressRegion": "Jawa Barat", "postalCode": "40531", "addressCountry": "ID"},
  "location": [
    {"@type": "Place", "name": "Kampus Cimahi", "hasMap": "https://maps.app.goo.gl/cmgjbBHR3Sh6EQW27"},
    {"@type": "Place", "name": "Kampus Bandung", "address": "Jl. Terusan Jenderal Gatot Subroto PO Box 807, Bandung, Jawa Barat", "hasMap": "https://maps.app.goo.gl/KHYhprih9Z8my94F8"}
  ],
  "contactPoint": [{"@type": "ContactPoint", "contactType": "admissions", "email": "admisi@unjani.ac.id", "telephone": "+62-811-2497-890", "availableLanguage": ["id", "en"]}],
  "sameAs": ["https://www.unjani.ac.id/", "https://www.instagram.com/infopmbunjani/", "https://www.tiktok.com/@pmbunjani", "https://www.youtube.com/@UNJANIOFFICIAL"]
}
```
*(File logo di server saat ini bernama `/logo-pmb-unjani (1).png`. Ganti namanya agar tanpa spasi dan tanda kurung.)*

**FAQPage (`/faq`, teks sama persis dengan FAQ di halaman):**
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {"@type": "Question", "name": "Apakah pendaftaran PMB UNJANI bisa dilakukan secara offline?",
     "acceptedAnswer": {"@type": "Answer", "text": "Saat ini pendaftaran hanya tersedia secara online melalui portal resmi PMB UNJANI. Jika mengalami kesulitan teknis, Anda dapat berkonsultasi di Kantor Admisi, Gedung Rektorat Lantai 1."}},
    {"@type": "Question", "name": "Apa itu One Day Services (ODS) UNJANI?",
     "acceptedAnswer": {"@type": "Answer", "text": "ODS adalah layanan pendaftaran dan pengumuman kelulusan dalam 1x24 jam secara online, khusus untuk prodi dan jalur non-tes tertentu (Bakti Negeri, Prestasi, Rapor, UTBK/TKA)."}},
    {"@type": "Question", "name": "Bagaimana cara mengikuti USM/CBT online UNJANI?",
     "acceptedAnswer": {"@type": "Answer", "text": "Ujian dilaksanakan di https://exam-pmb.unjani.ac.id/ menggunakan Google Chrome. Peserta wajib mengikuti briefing sehari sebelum ujian, dengan internet minimal 2 Mbps dan kamera berfungsi."}}
  ]
}
```

**BreadcrumbList (contoh halaman jalur):**
```json
{"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
  {"@type": "ListItem", "position": 1, "name": "Beranda", "item": "https://pmb.unjani.ac.id/"},
  {"@type": "ListItem", "position": 2, "name": "Jalur Masuk", "item": "https://pmb.unjani.ac.id/jalur-masuk"},
  {"@type": "ListItem", "position": 3, "name": "Jalur PMDK", "item": "https://pmb.unjani.ac.id/jalur-masuk/pmdk"}]}
```

**Event (ujian CBT; tanggal belum tercantum di situs, isi dari jadwal resmi):**
```json
{
  "@context": "https://schema.org", "@type": "Event",
  "name": "Ujian CBT/USM Online PMB UNJANI 2027",
  "startDate": "2027-01-XXT08:00+07:00", "endDate": "2027-01-XXT12:00+07:00",
  "eventStatus": "https://schema.org/EventScheduled",
  "eventAttendanceMode": "https://schema.org/OnlineEventAttendanceMode",
  "location": {"@type": "VirtualLocation", "url": "https://exam-pmb.unjani.ac.id/"},
  "organizer": {"@id": "https://pmb.unjani.ac.id/#organization"},
  "offers": {"@type": "Offer", "price": "300000", "priceCurrency": "IDR", "url": "https://pendaftaran.unjani.ac.id/register"}
}
```

**Article:** ganti author menjadi `{"@type":"Organization","name":"Panitia PMB UNJANI"}`, pastikan `dateModified ≥ datePublished`, dan perbaiki `publisher.logo`. Hapus juga duplikat `CollegeOrUniversity` di `/kontak`.

---

## 5. Kompetitor (beranda di-scrape 5 Nov 2026)

| Aspek | **UNJANI** | **Unpas** | **Telkom University** | **UNIKOM** |
|---|---|---|---|---|
| Title beranda | "PMB UNJANI" | "Penerimaan Mahasiswa Baru UNPAS" | "SMB Telkom University - Pendaftaran dan Jurusan Kuliah" | "Penerimaan Mahasiswa Baru \| Universitas Komputer Indonesia" |
| Meta description | Baik (160 karakter), tanpa tahun dan lokasi | "Penerimaan Mahasiswa Baru UNPAS **2027** resmi dibuka. Informasi **biaya kuliah**, program studi, dan jalur pendaftaran…" | "Bangun masa depanmu melalui puluhan jurusan berbasis IT…" | "Penerimaan Mahasiswa Baru Universitas Komputer Indonesia (UNIKOM)." |
| Kata di beranda | 4.098 | 2.098 | 2.042 | 77 |
| Canonical | ✅ | ✅ | ✅ | ❌ |
| JSON-LD | CollegeOrUniversity, WebSite, Breadcrumb | CollegeOrUniversity + PostalAddress, WebSite | Yoast graph (WebSite, WebPage, Organization, Article, Breadcrumb) | ❌ |
| Halaman jalur/prodi terpisah | ❌ | ✅ link ke detail jalur dan prodi (`situ2.unpas.ac.id/spmbfront/…`) | ✅ `/jalur-seleksi` + sub-halaman | ❌ |
| hreflang | ✅ | ❌ | ❌ | ❌ |

Unisba (`pmb.unisba.ac.id`) menampilkan "Sorry, the website has been stopped", sehingga tidak bisa dibandingkan.

**Kesimpulan:**
- Unpas kini paling agresif untuk query "PMB 2027" dan "biaya kuliah" di tingkat meta.
- Telkom University tetap menjadi benchmark arsitektur (halaman per niat pencarian).
- UNIKOM paling lemah secara teknis.
- UNJANI unggul dalam kedalaman konten dan hreflang, tetapi kalah di arsitektur URL dan penargetan keyword.

---

## 6. Visibilitas di AI Search (ChatGPT, Gemini, Perplexity)

| Faktor | Status | Bukti |
|---|---|---|
| Fakta kunci dalam HTML | ⚠️ | Syarat jalur dan FAQ ada di HTML. Biaya hanya di PDF yang diblokir `Disallow: /api` |
| Angka konsisten | ❌ | Counter "Fakultas-233511". "12 jalur" vs 14 jalur |
| Halaman per topik | ❌ | Semua di `/` |
| Kesegaran | ⚠️ | Artikel 2027/2028 sudah ada, tetapi blok pengumuman masih 2026/2027 |
| Entitas jelas | ⚠️ | Alamat hanya di footer, tidak di schema. Logo schema 404 |
| `llms.txt` | ❌ | 404 |
| Akses bot AI | ✅ | robots.txt tidak memblokir GPTBot, Google-Extended, maupun PerplexityBot |

**Rekomendasi:**
1. Buka setiap halaman topik dengan paragraf faktual 40–60 kata, misalnya biaya awal, rentang per semester, dan tanggal penutupan.
2. Sajikan biaya, jalur, dan jadwal dalam tabel HTML.
3. Buat `/llms.txt` yang berisi ringkasan PMB dan tautan ke halaman topik.
4. Cantumkan "Terakhir diperbarui" di halaman biaya dan jadwal.
5. Pastikan nama entitas konsisten: "Universitas Jenderal Achmad Yani (UNJANI), Cimahi, Jawa Barat".

---

## 7. Quick Wins (1 Minggu)

| # | Tindakan | Temuan | Upaya |
|---|---|---|---|
| 1 | Redirect 301 `http://` dan `www.` → `https://pmb.unjani.ac.id` + HSTS | K1 | 1–2 jam |
| 2 | Redirect 301 untuk URL lama bertopik PMB, dan 410 untuk `*/feed`, `/tag/*`, halaman uji, serta `/desain-utama/*` | K3 | 2–3 jam |
| 3 | Title dan meta beranda baru | P1 | 30 menit |
| 4 | Perbarui blok Pengumuman beranda ke 2027/2028 | P6 | 1–2 jam |
| 5 | Optimalkan artikel 2027/2028 (meta, fakta, link, schema) | P7 | 2 jam |
| 6 | Perbaiki link: `exam.pmb` → `exam-pmb`, `wa.me/0811…` → `wa.me/62811…`, `http://pendaftaran` → `https://`, dan `logo.svg` | P5 | 30 menit |
| 7 | Pindahkan PDF publik keluar dari `/api` | K4 | 1 jam |
| 8 | Ganti teks kalkulator kosong dengan tabel biaya 2026 berlabel "acuan" | K4 | 2 jam |
| 9 | Render counter final di SSR | P3 | 1 jam |
| 10 | Hero image dengan `priority` + `sizes` | P9 | 15 menit |
| 11 | Tambahkan `x-default`, dan beri `noindex` pada `/en` yang belum diterjemahkan | P4 | 1–2 jam |
| 12 | Samakan FAQ "12 jalur" dengan 14 jalur di halaman | P10 | 15 menit |
| 13 | Tambahkan FAQPage JSON-LD untuk 11 FAQ di beranda | P8 | 1 jam |

---

## 8. Roadmap 30 / 60 / 90 Hari

### Hari 1–30: Fondasi dan arsitektur
- Selesaikan semua quick wins.
- Bangun halaman SSR **`/biaya-kuliah`** lebih dulu (Unpas sudah menargetkan "biaya kuliah"), lalu **`/jalur-masuk`**, **`/faq`**, dan **`/jadwal`**. Setiap halaman punya title, meta, H1, breadcrumb, dan schema sendiri.
- Ganti navigasi anchor `#` menjadi URL nyata.
- Perbaiki heading (nama jalur dan pertanyaan FAQ) dan hilangkan teks ganda.
- Ukur baseline: impresi 6 keyword utama di Search Console, PageSpeed Insights mobile, dan cek kutipan manual di AI search.

### Hari 31–60: Konten per niat dan lokal
- Buat 14 halaman `/jalur-masuk/{jalur}`, termasuk KIP-Kuliah dan Kemitraan.
- Buat `/program-studi` dan halaman per prodi, dimulai dari Pendidikan Dokter, Farmasi, Psikologi, Teknik Informatika, Manajemen, Akuntansi, Ilmu Keperawatan, dan Hukum. Gunakan schema `EducationalOccupationalProgram`.
- Buat landing `/kuliah-di-cimahi` dan `/beasiswa`.
- Lengkapi `/kontak` dengan telepon, jam layanan, dan peta, dan selaraskan dengan Google Business Profile.
- Rapikan slug, meta, kategori, dan penulis artikel (dengan 301), lalu buat `llms.txt`.

### Hari 61–90: Otoritas dan skala
- Terbitkan 2–4 artikel per bulan, misalnya "PMDK vs Rapor UNJANI", "biaya kuliah kedokteran UNJANI", "kos dekat UNJANI Cimahi", dan "cara daftar UNJANI".
- Buat halaman event (campus tour, briefing CBT, try out) dengan Event schema.
- Tambahkan bukti sosial: testimoni, alumni, akreditasi institusi beserta nomor SK, dan sertifikat akreditasi semua prodi.
- Bangun link lokal dari sekolah mitra di Jawa Barat, media Cimahi/Bandung, serta `unjani.ac.id` dan situs fakultas.
- Lakukan audit ulang dengan Firecrawl untuk memverifikasi redirect, link, dan schema, lalu bandingkan dengan baseline.

---

## Lampiran: Status URL Teknis (Firecrawl, 5 Nov 2026)

| URL | Status akhir | URL akhir |
|---|---|---|
| `http://pmb.unjani.ac.id` | 200 | `http://pmb.unjani.ac.id/` ❌ |
| `https://www.pmb.unjani.ac.id` | 200 | `http://pmb.unjani.ac.id/` ❌ |
| `/halaman-yang-tidak-ada-404-test` | 404 ✅ | halaman 404 kustom |
| `/kontak/` | 200 | `/kontak` ✅ |
| `/robots.txt` | 200 ✅ | |
| `/sitemap.xml` | 200 ✅ | 24 URL |
| `/llms.txt` | 404 | |
| `/logo.svg` | 404 ❌ | |
| `/og-default.png` | 200 ✅ | |
| `https://exam-pmb.unjani.ac.id/` | 503 ❌ | |
| `https://exam.pmb.unjani.ac.id/` | DNS gagal ❌ | |
| `http://s.unjani.ac.id/bukuperaturanakademik` | 403 | `http://baa.unjani.ac.id/…/PERATURAN-AKADEMIK-2021.pdf` |
| `https://pendaftaran.unjani.ac.id/register` | 200 ✅ | |
| `/api/files/6a6975b0a90c243b4d2c618e` (PDF biaya) | 200, diblokir robots `/api` | |
| `https://unjani.ac.id/` | 200 | `https://www.unjani.ac.id/` |

**Lokasi data mentah** (relatif terhadap `/tmp/claude-0/-home-user/87da3837-48c0-5393-b396-851afcd325d2/scratchpad/re/raw/`): `test_scrape.json`, `map.json`, `robots.json`, `sitemap.json`, `site_urls.txt`, `pages/*.json`, `tech/*.json`, `analysis.json`, `log_a.txt`, `log_b.txt`, `log_tech.txt`.
