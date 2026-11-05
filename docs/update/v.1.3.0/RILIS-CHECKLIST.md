# Checklist Rilis v1.3.0

Dokumen bukti untuk baseline, checkpoint Fase A, dan gerbang rilis Fase B. Status
baseline bukan pernyataan kesiapan rilis; semua butir FR-20 wajib lulus pada
pemeriksaan final.

## Status bukti

- `LULUS`: syarat terbukti dari hasil pemeriksaan.
- `GAGAL`: hasil nyata tidak memenuhi syarat.
- `BELUM DIVERIFIKASI`: bukti yang diperlukan belum dapat diakses.

## Prasyarat rollback

| Butir | Status | Bukti |
|---|---|---|
| Git dan tag kondisi awal | LULUS | Commit `775da56`, tag `v1.2.0-pre`, worktree bersih |
| Backup database + dry-run restore | BELUM DIVERIFIKASI | Dilewati atas instruksi pemilik pada 7 Agustus 2026; bukan dianggap lulus |
| Backup `uploads` dan `public/uploads` | BELUM DIVERIFIKASI | Dilewati atas instruksi pemilik; bukan dianggap lulus |
| Backup aplikasi dan `.env` | BELUM DIVERIFIKASI | Dilewati atas instruksi pemilik; isi `.env` tidak dibaca/diubah |
| Kondisi runtime PM2/port/BUILD_ID | BELUM DIVERIFIKASI | Shell production tidak tersedia pada sesi pelaksana |

## T-01 — Baseline production

Waktu pemeriksaan: **7 Agustus 2026 10:48 WIB**. Target:
`https://pmb.unjani.ac.id/`.

| Butir FR-20 | Status baseline | Bukti nyata |
|---|---|---|
| Canonical dan sitemap memakai domain resmi | GAGAL | View-source landing memuat `<link rel="canonical" href="http://localhost:9500"/>`; sitemap memuat URL berbasis `http://localhost:9500` |
| ID analytics terisi dan mengirim data | BELUM DIVERIFIKASI | ID `G-LFQBTNNBVY`, loader dan `gtag('config', ...)` ada; skrip Google merespons HTTP 200. GA Realtime tidak dapat diakses pada sesi ini |
| www/non-www dan HTTP menuju satu host HTTPS | GAGAL | `http://pmb.unjani.ac.id/` merespons 200; `http://www` dan `https://www` merespons 301 ke `http://pmb.unjani.ac.id/` |
| Header cache aset statis diketahui | LULUS | Aset CSS `/_next/static/chunks/0smbokfry1jh0.css` merespons 200 dengan `Cache-Control: public, max-age=31536000, immutable` |

### Bukti perintah T-01

Canonical dari source production:

```text
<link rel="canonical" href="http://localhost:9500"/>
```

Analytics dari source dan endpoint loader:

```text
https://www.googletagmanager.com/gtag/js?id=G-LFQBTNNBVY
gtag('config', 'G-LFQBTNNBVY');
HTTP/1.1 200 OK
Content-Type: application/javascript; charset=UTF-8
```

Rantai redirect host:

```text
http://pmb.unjani.ac.id/       -> HTTP/1.1 200 OK
http://www.pmb.unjani.ac.id/   -> 301 Location: http://pmb.unjani.ac.id/ -> 200
https://www.pmb.unjani.ac.id/  -> 301 Location: http://pmb.unjani.ac.id/ -> 200
https://pmb.unjani.ac.id/      -> HTTP/1.1 200 OK
```

Header cache aset statis:

```text
URL: https://pmb.unjani.ac.id/_next/static/chunks/0smbokfry1jh0.css
HTTP/1.1 200 OK
Content-Type: text/css; charset=UTF-8
Content-Length: 79048
Cache-Control: public, max-age=31536000, immutable
X-Cache: BYPASS
```

Baseline sitemap:

```text
http://localhost:9500/
http://localhost:9500/pengumuman
http://localhost:9500/kontak
http://localhost:9500/pengumuman/gelombang-4
http://localhost:9500/pengumuman/mekanisme-ods
http://localhost:9500/pengumuman/pembukaan-pmb-2026-2027
```

## Bukti checkpoint berikutnya

| Task | Status | Bukti |
|---|---|---|
| T-02 — kesegaran sitemap production | LULUS | Perilaku terbukti beku: halaman uji aktif, tetapi slug tidak masuk sitemap selama empat pemeriksaan tanpa rebuild |
| T-04 — gambar OG dan pratinjau WhatsApp | LULUS | Aset 200; meta gambar tiga halaman memakai domain resmi; pemilik mengonfirmasi ketiga pratinjau WhatsApp sesuai |
| T-07 — metadata 8 kombinasi | LULUS LOKAL | Delapan URL hasil build diperiksa; canonical self, hreflang id/en timbal balik, dan metadata baseline utuh |
| T-09 — sitemap ID/EN dan kesegaran | LULUS | Pengumuman baru masuk sebagai pasangan ID/EN 10 detik setelah respons stale pertama; empat pengumuman baseline tetap utuh |
| T-12 — kompresi upload hero | LULUS | Sumber 2,33MB menjadi WebP 185966 byte; tersaji langsung, optimizer 200, slider normal, dan 6/6 hero lama utuh |
| T-17 — CTA, GA Realtime, dan UTM | LULUS | Pemilik mengonfirmasi 5 interaksi GA, CTA hero/floating di ponsel, UTM, dan navigasi saat GA diblokir seluruhnya lulus |
| T-19 — singkatan anti-terjemahan | LULUS | Pemilik menguji production dengan auto-translate ID→EN: FEB tetap FEB, tooltip nama lengkap tampil, dan visual sebelum-sesudah dinyatakan identik; berkas screenshot tidak dilampirkan |
| T-20 — checkpoint regresi Fase A | LULUS | Butir 1–10 lulus di desktop dan ponsel; butir 11–15 lulus oleh pemilik; butir 16–17 serta empat butir FR-20 lulus teknis |
| T-49 — gerbang rilis final | GAGAL | Percobaan 10 Agustus 2026: canonical dan sitemap production kembali memakai `http://localhost:9500` |

## Checklist final FR-20

| Butir wajib | Baseline | Pra-rilis/final | Bukti final |
|---|---|---|---|
| Canonical/sitemap memakai domain resmi | GAGAL | GAGAL | Pemeriksaan 10 Agustus 2026 menemukan canonical landing dan seluruh URL sitemap memakai `http://localhost:9500` |
| GA menerima data dengan ID yang benar | BELUM DIVERIFIKASI | BELUM DIVERIFIKASI | Source memuat `G-LFQBTNNBVY`; konfirmasi final event artikel di GA Realtime belum diserahkan |
| HTTP host resmi mengarah ke HTTPS | GAGAL | LULUS | HTTP merespons 301 ke host/path/query HTTPS yang sama; varian `www` bukan kriteria berdasarkan keputusan pemilik produk 7 Agustus 2026 |
| Header cache aset statis diketahui | LULUS | LULUS | CSS build merespons `Cache-Control: public, max-age=31536000, immutable` |

## T-02 — Kesegaran sitemap production

Pengumuman uji: `pengumuman-uji-aktif`.

```text
URL halaman: https://pmb.unjani.ac.id/pengumuman/pengumuman-uji-aktif
HTTP/1.1 200 OK
Title/H1: Pengumaman Uji Aktif

11:13:35 WIB — slug di sitemap: tidak; ukuran: 958 byte
11:14:42 WIB — slug di sitemap: tidak; ukuran: 958 byte
11:15:12 WIB — slug di sitemap: tidak; ukuran: 958 byte
11:15:42 WIB — slug di sitemap: tidak; ukuran: 958 byte
```

Kesimpulan: sitemap production v1.2.0 dibekukan saat build dan tidak membaca
pengumuman baru pada request. T-08 wajib memberi mekanisme kesegaran eksplisit;
hasil ini tidak boleh dianggap memenuhi FR-13/FR-16 AC3.

Keputusan mekanisme T-08: sitemap memakai revalidasi berkala **60 detik**.
Pilihan ini memberi jendela kesegaran eksplisit setelah T-02 membuktikan sitemap
lama beku saat build, sekaligus membatasi query MongoDB dibanding dinamis penuh.
Pengujian production T-09 harus meminta sitemap sesudah lewat 60 detik dan
mengulang sekali untuk mengantisipasi respons lama saat revalidasi dimulai.

## T-07 — Metadata delapan kombinasi

Build production lokal memakai `NEXT_PUBLIC_SITE_URL=https://pmb.unjani.ac.id`.
Delapan URL merespons HTTP 200 pada pemeriksaan 7 Agustus 2026. Canonical setiap
URL menunjuk dirinya sendiri dan setiap pasangan memuat hreflang `id`/`en` yang
saling menunjuk:

```text
/                                            -> canonical /;                                            id /;                                  en /en
/en                                          -> canonical /en;                                          id /;                                  en /en
/pengumuman                                  -> canonical /pengumuman;                                  id /pengumuman;                        en /en/pengumuman
/en/pengumuman                               -> canonical /en/pengumuman;                               id /pengumuman;                        en /en/pengumuman
/pengumuman/pengumuman-uji-aktif             -> canonical /pengumuman/pengumuman-uji-aktif;             id /pengumuman/pengumuman-uji-aktif;   en /en/pengumuman/pengumuman-uji-aktif
/en/pengumuman/pengumuman-uji-aktif          -> canonical /en/pengumuman/pengumuman-uji-aktif;          id /pengumuman/pengumuman-uji-aktif;   en /en/pengumuman/pengumuman-uji-aktif
/kontak                                      -> canonical /kontak;                                      id /kontak;                            en /en/kontak
/en/kontak                                   -> canonical /en/kontak;                                   id /kontak;                            en /en/kontak
```

Semua URL di atas memakai host `https://pmb.unjani.ac.id`. Judul, deskripsi,
`og:title`, dan `og:description` identik dengan baseline production. Satu-satunya
perubahan `og:image` adalah host `localhost` menjadi domain resmi, sesuai FR-15
dan FR-20. Verifikasi production ulang tetap menjadi bagian T-20 setelah deploy.

## T-04 — Percobaan verifikasi gambar OG

Waktu pemeriksaan: **7 Agustus 2026 11:21 WIB**.

```text
GET https://pmb.unjani.ac.id/og-default.png
HTTP/1.1 404 Not Found

og:image live: http://localhost:9500/og-default.png
twitter:image live: http://localhost:9500/og-default.png
```

Status: **GAGAL**. Commit T-03 belum berada di production. Pratinjau WhatsApp
tidak diuji karena URL gambar sumber masih 404. T-03 dibuka kembali sampai
deployment production selesai; hasil WhatsApp wajib berasal dari pengujian
manusia setelah URL gambar merespons 200.

### Pemeriksaan ulang setelah deployment

Waktu pemeriksaan: **7 Agustus 2026 14:47 WIB**.

```text
GET https://pmb.unjani.ac.id/og-default.png
HTTP/1.1 404 Not Found

og:image beranda    = http://localhost:9500/og-default.png
og:image kontak     = http://localhost:9500/og-default.png
og:image pengumuman = http://localhost:9500/og-default.png
sitemap host        = http://localhost:9500
```

Status tetap **GAGAL**. Hreflang baru sudah muncul di header respons, sehingga
sebagian source baru telah aktif. Runtime production belum memiliki aset
`public/og-default.png`, dan build aktif dibuat dengan `NEXT_PUBLIC_SITE_URL`
yang masih bernilai `http://localhost:9500`. T-03 dibuka kembali; T-04 tidak
boleh dilanjutkan ke uji WhatsApp sebelum kedua masalah deployment ini selesai.

### Pemeriksaan ulang kedua setelah perbaikan deployment

Waktu pemeriksaan: **7 Agustus 2026 14:52 WIB**.

```text
GET https://pmb.unjani.ac.id/og-default.png -> HTTP 404
canonical beranda    = http://localhost:9500
canonical kontak     = http://localhost:9500/kontak
canonical pengumuman = http://localhost:9500/pengumuman
og:image ketiganya   = http://localhost:9500/og-default.png
```

Status tetap **GAGAL** dengan keluaran identik. Pemeriksaan konfigurasi lokal
menemukan `ecosystem.config.js` masih menunjuk `cwd` lama
`/www/wwwroot/dev-pmb.unjani.ac.id/v.1.0.1` dan tidak memasukkan
`NEXT_PUBLIC_SITE_URL`. Bukti `exec cwd` dari proses PM2 production diperlukan
untuk menentukan apakah aaPanel masih menjalankan direktori/build lama.

### Pemeriksaan ulang ketiga setelah perbaikan deployment

Waktu pemeriksaan: **7 Agustus 2026 14:55 WIB**.

```text
GET https://pmb.unjani.ac.id/og-default.png -> HTTP 200
Content-Type: image/png
Content-Length: 145446

canonical beranda    = http://localhost:9500
canonical kontak     = http://localhost:9500/kontak
canonical pengumuman = http://localhost:9500/pengumuman
og:image ketiganya   = http://localhost:9500/og-default.png
hreflang en beranda  = http://localhost:9500/en
sitemap              = 14 URL dwibahasa, seluruh host masih localhost:9500
```

T-03 ditutup kembali karena aset production sudah valid. T-04 tetap **GAGAL**:
build aktif masih memancarkan nilai `NEXT_PUBLIC_SITE_URL` lama, sehingga
WhatsApp tidak dapat mengambil gambar dari URL meta yang diberikan.

### T-04 lulus setelah build ulang

Waktu pemeriksaan teknis: **7 Agustus 2026 15:01 WIB**. Konfirmasi manusia:
**7 Agustus 2026 15:03 WIB**.

```text
GET /og-default.png -> HTTP 200, image/png, 145446 byte
canonical           -> https://pmb.unjani.ac.id (path sesuai halaman)
og:image             -> https://pmb.unjani.ac.id/og-default.png
twitter:image        -> https://pmb.unjani.ac.id/og-default.png
```

Beranda, kontak, dan pengumuman diperiksa dari source production. Pemilik produk
menguji ketiga URL dengan parameter cache-buster di WhatsApp dan mengonfirmasi
pratinjau sudah sesuai. Status akhir T-04: **LULUS**.

## T-09 — Sitemap ID/EN dan kesegaran

Waktu pemeriksaan: **7 Agustus 2026 15:09 WIB**. Pemilik menerbitkan
pengumuman baru setelah build terakhir dengan slug
`pengumuman-uji-sitemap-20260807`. Tidak ada rebuild selama pemeriksaan.

```text
GET /pengumuman/pengumuman-uji-sitemap-20260807 -> HTTP 200

15:09:32 WIB -> ID tidak; EN tidak; 14 URL; 4/4 pengumuman baseline utuh
15:09:42 WIB -> ID ada;   EN ada;   16 URL; 4/4 pengumuman baseline utuh
```

URL baru yang muncul:

```text
https://pmb.unjani.ac.id/pengumuman/pengumuman-uji-sitemap-20260807
https://pmb.unjani.ac.id/en/pengumuman/pengumuman-uji-sitemap-20260807
```

Status T-09: **LULUS**. Respons stale pertama memicu revalidasi; pasangan URL
baru tersedia 10 detik kemudian, masih di dalam jendela 60 detik yang ditetapkan
T-08. Seluruh URL memakai domain resmi dan entri lama tidak hilang.

## T-12 — Percobaan kompresi upload hero

Waktu pemeriksaan: **7 Agustus 2026 15:14 WIB**. Pemilik mengunggah gambar
melalui **Admin → Halaman → Hero** dan melaporkan alur UI berhasil. Landing
setelah upload memuat delapan URL hero: enam URL baseline dan dua URL WebP baru.

```text
Hero baseline yang tetap tercatat = 6/6

/uploads/hero/2-unjani-render-58c051c8-5c81-45fc-9577-e01a15ad4c83.webp
-> HTTP 404

/uploads/hero/2-unjani-render-8b3cc4cd-51c2-472a-b183-36dc38d684bb.webp
-> HTTP 404

Sampel hero lama -> HTTP 200, 460954 byte
Optimizer hero baru -> HTTP 400
```

Status T-12: **GAGAL**. Mutasi data menyimpan URL baru dan keenam hero lama tidak
tersentuh, tetapi berkas baru tidak tersaji oleh runtime. T-11 dibuka kembali.
PLAN hanya menetapkan pemrosesan ke `public/uploads/hero`; penambahan route
penyaji atau perpindahan storage membutuhkan keputusan eksplisit karena berada
di luar scope T-11 yang disetujui.

Pemilik memilih opsi route publik dinamis pada 7 Agustus 2026. Koreksi T-11
commit `b22f979` mempertahankan URL `/uploads/hero/<filename>` dan membaca file
secara aman saat request. Uji production lokal membuat file sesudah server
berjalan: HTTP 200, `image/png`, 145446 byte, cache immutable; file hilang dan
ekstensi tak valid masing-masing HTTP 404. T-12 harus diulang setelah commit ini
dideploy.

### T-12 lulus setelah koreksi route publik

Waktu pemeriksaan: **7 Agustus 2026 15:37 WIB**. Berkas sumber yang dipilih
berukuran **2,33MB** dan diunggah sesudah proses production berjalan.

```text
URL hasil     = /uploads/hero/screenshot_2026-04-05_210529-1srcqq7cmoo-c09149e0-2c30-42f3-a483-65f31373a8df.webp
HTTP          = 200
Content-Type  = image/webp
Content-Length= 185966 byte
Cache-Control = public, max-age=31536000, immutable
Next optimizer= HTTP 200, 82946 byte
Landing       = HTTP 200
Hero lama     = 6/6 tetap ada
```

Pemilik mengonfirmasi gambar baru tampil dan slider berpindah normal. Ukuran
hasil di bawah batas 307200 byte (300 KiB), file langsung tersaji tanpa restart,
dan tidak ada hero lama yang dihapus. Status akhir T-12: **LULUS**.

## T-17 — CTA, GA Realtime, dan UTM

Waktu konfirmasi manusia: **7 Agustus 2026 15:40 WIB**. Pengujian dilakukan
pemilik produk pada production dengan akses GA Realtime dan ponsel nyata.

```text
5 interaksi GA             = LULUS
CTA daftar hero            = LULUS
CTA daftar melayang ponsel = LULUS
Parameter UTM ikut request = LULUS
Navigasi saat GA diblokir  = LULUS
```

Interaksi yang diperiksa:

```text
pmb_cta_daftar_click, location=hero
pmb_cta_daftar_click, location=floating
pmb_whatsapp_click
pmb_document_download
pmb_calculator_submit
```

Kondisi tanpa UTM tetap memakai URL dasar. Kondisi dengan
`utm_source=uji&utm_campaign=uji` membawa parameter pada request awal ke sistem
pendaftaran. Pemblokiran GA tidak menghalangi navigasi. Screenshot tidak
tersedia pada sesi browser pelaksana; hasil di atas adalah bukti eksplisit yang
diserahkan pemilik produk. Status akhir T-17: **LULUS**.

## T-20 — Percobaan checkpoint regresi Fase A

Waktu pemeriksaan teknis: **7 Agustus 2026 15:48 WIB**. Pemeriksaan dihentikan
setelah menemukan kegagalan gerbang FR-20(c); butir regresi manusia 1–17 belum
boleh dinyatakan lulus sampai konfigurasi host production diperbaiki.

Canonical, sitemap, analytics, dan cache aset:

```text
canonical landing     = https://pmb.unjani.ac.id
canonical pengumuman  = https://pmb.unjani.ac.id/pengumuman/pengumuman-uji-sitemap-20260807
sitemap               = seluruh URL memakai https://pmb.unjani.ac.id; varian ID/EN ada
GA measurement ID     = G-LFQBTNNBVY; penerimaan Realtime lulus pada T-17
aset CSS              = HTTP 200; Cache-Control: public, max-age=31536000, immutable
og-default.png        = HTTP 200; image/png; 145446 byte
robots.txt            = Disallow: /admin dan Disallow: /api
```

Rantai host yang gagal:

```text
http://pmb.unjani.ac.id/       -> HTTP 200 (seharusnya redirect HTTPS)
http://www.pmb.unjani.ac.id/   -> 301 Location: http://pmb.unjani.ac.id/
https://www.pmb.unjani.ac.id/  -> 301 Location: http://pmb.unjani.ac.id/
https://pmb.unjani.ac.id/      -> HTTP 200
```

Pemilik produk memutuskan pada 7 Agustus 2026 bahwa perilaku varian `www`
sengaja dikecualikan dan bukan kriteria rilis. Kegagalan yang tersisa hanya
`http://pmb.unjani.ac.id/` yang masih merespons 200, bukan mengarah ke HTTPS.

Status T-20: **GAGAL**. PLAN A0/A8 menetapkan redirect sebagai verifikasi
operasional tanpa perubahan kode, tetapi kenyataan production membutuhkan
perubahan konfigurasi aaPanel/web server. Sesuai kontrak eksekusi, T-20 tetap
terbuka dan Fase B tidak dimulai sebelum redirect HTTP host resmi diperbaiki,
lalu seluruh pemeriksaan diulang.

### T-20 lulus setelah koreksi redirect dan regresi penuh

Waktu pemeriksaan akhir: **7 Agustus 2026 15:55 WIB**. Redirect host resmi
mempertahankan path dan query:

```text
http://pmb.unjani.ac.id/
-> HTTP 301 Location: https://pmb.unjani.ac.id/

http://pmb.unjani.ac.id/pengumuman?uji=1
-> HTTP 301 Location: https://pmb.unjani.ac.id/pengumuman?uji=1

https://pmb.unjani.ac.id/
-> HTTP 200
```

Pemilik produk menyerahkan hasil regresi manusia berikut:

```text
IMPACT §8 butir 1–10 desktop = LULUS
IMPACT §8 butir 1–10 ponsel  = LULUS
11 pengumuman bergambar      = LULUS
12 login/logout admin        = LULUS
13 RBAC editor               = LULUS
14 CRUD FAQ                  = LULUS
15 upload hero ≥2MB          = LULUS
```

Pemeriksaan teknis butir 16–17:

```text
16 canonical landing     = https://pmb.unjani.ac.id
16 canonical pengumuman  = https://pmb.unjani.ac.id/pengumuman/pengumuman-uji-sitemap-20260807
16 hreflang ID/EN         = ada dan saling menunjuk
16 og-default.png         = HTTP 200; image/png; 145446 byte
17 sitemap                = URL ID/EN dan pengumuman existing ada; seluruh host resmi HTTPS
17 robots.txt             = Disallow: /admin dan Disallow: /api
```

Bagian artikel pada butir 16–17 belum berlaku di Fase A dan wajib diperiksa
pada T-49 setelah modul Artikel selesai. Empat butir FR-20 seluruhnya LULUS.
Status akhir T-20: **LULUS**; gerbang Fase A terbuka.

## T-24 — Verifikasi model Artikel dan KategoriArtikel

Waktu pemeriksaan: **7 Agustus 2026 16:16 WIB**. Pengujian memakai MongoDB
lokal `127.0.0.1` dengan database khusus `pmb_unjani_v130_t24`, bukan koneksi
production. Nama host dan database diverifikasi sebelum pengujian dan sebelum
pembersihan.

```text
Index Artikel:
_id_                          {_id:1}
slug_1                        {slug:1} unique
status_1                      {status:1}
publishedAt_1                 {publishedAt:1}
pinned_1                      {pinned:1}
kategori_id_1                 {kategori_id:1}
tags_1                        {tags:1}
createdBy_1                   {createdBy:1}
deletedAt_1                   {deletedAt:1}
status_1_publishedAt_-1       {status:1,publishedAt:-1}
pinned_-1_publishedAt_-1      {pinned:-1,publishedAt:-1}

Index KategoriArtikel:
_id_                          {_id:1}
slug_1                        {slug:1} unique

SLUG_ARTIKEL_DUPLIKAT_DITOLAK=true (kode MongoDB 11000)
SLUG_KATEGORI_DUPLIKAT_DITOLAK=true (kode MongoDB 11000)
SLUG_PUBLIK=["jadwal-lampau","terbit"]
FILTER_PUBLIK_LULUS=true
DATABASE_UJI_DIBERSIHKAN=true
```

Data uji mencakup Draft, Terbit, Terjadwal-lampau, Terjadwal-masa-depan,
Arsip, dan Terbit-terhapus. Hanya Terbit serta Terjadwal-lampau yang lolos;
Draft, jadwal masa depan, Arsip, dan soft-delete tersaring. Status T-24:
**LULUS**.

## T-26 — Verifikasi menu dan akses Artikel

Waktu pemeriksaan: **7 Agustus 2026 16:21 WIB**. Pemeriksaan langsung terhadap
`ADMIN_NAV`, `canAccessPage`, `canAccessApi`, dan `proxy()` menghasilkan:

```text
ARTIKEL_TOP_LEVEL=true
KATEGORI_TOP_LEVEL=true
ARTIKEL_SEMUA_PERAN=true
KATEGORI_SEMUA_PERAN=true
MASTER_DATA_EDITOR_TERSEMBUNYI=true

EDITOR_ARTIKEL_PAGE=true
EDITOR_ARTIKEL_API=true
EDITOR_KATEGORI_API=true
ADMIN_ARTIKEL_PAGE=true
ADMIN_ARTIKEL_API=true
ADMIN_KATEGORI_API=true
SUPERADMIN_ARTIKEL_PAGE=true
SUPERADMIN_ARTIKEL_API=true
SUPERADMIN_KATEGORI_API=true
EDITOR_MASTER_DATA_DITOLAK=true

GET anonim /admin/artikel
STATUS_ANONIM=307
LOCATION_ANONIM=http://localhost:9532/admin/login?next=%2Fadmin%2Fartikel
REDIRECT_LOGIN_LULUS=true
```

Artikel dan Kategori Artikel adalah item tingkat atas tanpa batasan peran, bukan
anak Master Data. Pemetaan prefix juga mencakup halaman tambah/edit, restore,
upload sampul, dan route API per-id. Status T-26: **LULUS**.

## T-32 — Verifikasi API Artikel dan Kategori Artikel

Waktu pemeriksaan: **7 Agustus 2026 16:45 WIB**. Handler route dijalankan
langsung memakai MongoDB lokal pada database khusus `pmb_unjani_v130_t32` dan
JWT sementara yang hanya hidup di proses uji. Konfigurasi `.env` tidak dibaca
atau diubah.

Pemeriksaan pertama menemukan route daftar Artikel belum mendaftarkan model
`AdminUser` yang diperlukan oleh `populate('createdBy')`. T-27 dibuka kembali,
dikoreksi pada commit `e887306`, lalu seluruh skenario T-32 diulang dari database
bersih dengan hasil:

```text
LULUS database=pmb_unjani_v130_t32
LULUS kategori=create,list,update,delete,blokir-terpakai-soft-delete
LULUS artikel=create,list,get,update,soft-delete,restore
LULUS RBAC=editor-A-ditolak-milik-B,admin-lolos
LULUS audit Artikel=6 KategoriArtikel=4
LULUS sampul=1200x675 1548B WebP
LULUS PDF-menyamar-jpg=400 tanpa-berkas-baru
```

Sampul bersumber dari JPEG 4000×3000 piksel. Berkas hasil dibaca kembali dari
disk untuk memverifikasi format WebP dan dimensi 1200×675, lalu dilayani oleh
route publik dengan HTTP 200 dan `Content-Type: image/webp`. PDF berisi magic
bytes `%PDF` tetapi bernama `.jpg` ditolak HTTP 400 dan jumlah berkas tidak
bertambah. Penghapusan kategori juga tetap diblokir ketika satu-satunya artikel
yang merujuknya sudah soft-delete.

```text
DATABASE_UJI_DIBERSIHKAN=true
BERKAS_SAMPUL_UJI_DIHAPUS=true
```

Status T-32: **LULUS**.

## T-38 — Verifikasi alur admin Artikel

Waktu konfirmasi manusia: **8 Agustus 2026**. Browser otomatis tidak tersedia
pada sesi pelaksana, sehingga pemeriksaan UI dijalankan oleh pemilik produk dan
hasil eksplisit berikut diserahkan:

```text
CRUD kategori artikel                 = LULUS
Draft tanpa sampul                    = LULUS
Editor Artikel tanpa kemampuan gambar = LULUS
Terjadwal → Terbit → Arsip            = LULUS
Hapus → daftar terhapus → Pulihkan    = LULUS
Blokir hapus kategori terpakai        = LULUS
Sisip gambar pada editor Pengumuman   = LULUS
```

Butir editor Artikel mencakup tombol gambar tidak tersedia serta tempel/seret
gambar tidak menyisipkan gambar. Butir Pengumuman memastikan prop baru
`RichTextEditor` tidak mengubah perilaku default modul existing. Status T-38:
**LULUS**.

## T-43 — Verifikasi halaman publik Artikel

Waktu pemeriksaan: **8 Agustus 2026**. Server production-mode lokal memakai
database khusus `pmb_unjani_v130_t43` berisi 20 artikel layak-tampil, satu
artikel soft-delete, dan satu Draft. View-source diperiksa dari respons HTTP
awal, bukan DOM hasil JavaScript.

```text
Indeks 20 artikel; kartu halaman 1/2/3 = 9/9/2
Filter kategori; halaman kedua         = 3 kartu dari 12 hasil
Filter tag snbt                        = 5 kartu
Pencarian beasiswa                     = 2 kartu
Pencarian [.*+?^${}()|\]               = HTTP 200
Detail ID: judul dan isi di HTML awal  = LULUS
Detail EN tanpa field _en: fallback ID = LULUS
Meta title/description fallback        = LULUS
Meta title/description manual          = LULUS
JSON-LD Article + BreadcrumbList       = terurai; headline, datePublished,
                                         author, dan 3 breadcrumb valid
Nama penulis Rina T43 di source        = true
Email penulis di source                = false
Role penulis di source                 = false
Artikel soft-delete                    = HTTP 404
Artikel Draft                          = HTTP 404
```

JSON-LD divalidasi dari source dengan mengurai seluruh blok
`application/ld+json` dan memeriksa tipe serta field wajib Rich Results. Browser
eksternal tidak tersedia untuk menyimpan screenshot validator. Database dan
server uji dibersihkan setelah pemeriksaan (`T43_DB_EXISTS=false`). Status T-43:
**LULUS**.

## T-45 — Verifikasi section Artikel pada landing

Waktu pemeriksaan: **8 Agustus 2026 22:04 WIB**. Server production-mode lokal
memakai database khusus `pmb_unjani_v130_t45`. Pemeriksaan pertama membuka
landing EN saat koleksi Artikel kosong. Setelah itu lima artikel Terbit
ditambahkan, terdiri dari satu artikel unggulan yang lebih lama dan empat
artikel biasa dengan waktu terbit berbeda, lalu landing ID diperiksa.

```text
HTTP_LANDING=200
ARTIKEL_NOL_SECTION_TERSEMBUNYI=true
JUMLAH_KARTU_ARTIKEL=3
URUTAN_KARTU=Artikel Unggulan T45 > Artikel Terbaru 1 T45 > Artikel Terbaru 2 T45
LIMA_UNSUR_KARTU=sampul,judul,ringkasan,penulis,tanggal
SECTION_EXISTING_UTUH=10
DATABASE_UJI_DIBERSIHKAN=true
```

Sepuluh penanda existing yang tetap ditemukan di HTML awal adalah hero, jalur
seleksi, jadwal, dokumen, kalkulator, fakultas/program studi, pengumuman, FAQ,
CTA, dan popup. Feed Instagram sengaja dinonaktifkan selama uji agar tidak
mengakses layanan eksternal; diff T-44 memperlihatkan hanya penambahan import,
query, dan render `ArtikelSection`, tanpa mengubah blok Instagram maupun section
existing lain. Status T-45: **LULUS**.

## T-47 — Verifikasi sitemap Artikel

Waktu pemeriksaan: **8 Agustus 2026 22:08 WIB**. Fungsi pembentuk sitemap
dijalankan terhadap database MongoDB lokal khusus `pmb_unjani_v130_t47`.
Artikel yang sama diperiksa saat berstatus Terbit, setelah dipindahkan ke Arsip,
dan setelah diberi penanda soft-delete.

```text
URL_ID_TERBIT=true
URL_EN_TERBIT=true
URL_ID_ARSIP=false
URL_EN_ARSIP=false
URL_ID_SOFT_DELETE=false
URL_EN_SOFT_DELETE=false
INDEKS_ID=true
INDEKS_EN=true
DATABASE_UJI_DIBERSIHKAN=true
```

URL detail ID dan EN masuk bersama saat artikel layak tampil, lalu keduanya
keluar ketika artikel diarsipkan maupun dihapus secara lunak. URL indeks Artikel
untuk kedua bahasa juga tersedia. Status T-47: **LULUS**.

## T-49 — Percobaan gerbang rilis final

Waktu pemeriksaan eksternal: **10 Agustus 2026 09:00 WIB**. Pemilik produk
menyerahkan hasil LULUS untuk regresi butir 1–18. Pemeriksaan teknis langsung
terhadap deployment menemukan hasil yang bertentangan pada butir 16:

```text
HTTPS_LANDING=200
CANONICAL_LANDING=http://localhost:9500
SITEMAP_ID=http://localhost:9500/
SITEMAP_EN=http://localhost:9500/en
SITEMAP_ARTIKEL=true
HTTP_NON_WWW=301 -> https://pmb.unjani.ac.id/
GA_ID_SOURCE=G-LFQBTNNBVY
ROBOTS_ADMIN=true
ROBOTS_API=true
STATIC_CACHE=public, max-age=31536000, immutable
```

Karena canonical dan domain sitemap tidak memakai domain resmi, percobaan T-49
berstatus **GAGAL** dan T-20 dibuka kembali. T-49 tetap belum selesai sampai
konfigurasi build production diperbaiki, deployment dibangun ulang, seluruh
bukti teknis diulang, event artikel dikonfirmasi di GA Realtime, dan pemilik
menegaskan cakupan uji desktop serta ponsel nyata.
