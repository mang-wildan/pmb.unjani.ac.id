# RILIS-CHECKLIST v1.4.0

Bukti verifikasi per task. Rujukan: SPEC.md dan TODO.md (folder ini).

## Baseline 1.4.0 (production, 5 November 2026 ±17.00 WIB)

| Cek | Hasil |
|---|---|
| `http://pmb.unjani.ac.id/` | `200 OK` (tanpa redirect ke HTTPS) |
| `https://www.pmb.unjani.ac.id/` | `301 Moved Permanently` (tujuan tidak dicatat; audit: `http://pmb.unjani.ac.id/`) |
| Header `strict-transport-security` | `max-age=63072000; includeSubDomains; preload` (sudah ada) |
| Header `Link` hreflang | **sudah memuat `x-default`**, tapi URL-nya `http://pmb.unjani.ac.id/...` (skema HTTP, karena nginx tidak meneruskan `X-Forwarded-Proto`). Temuan tambahan: periksa di T.3.0 |
| `<title>` beranda | `PMB UNJANI` |
| robots.txt | `Allow: /`, `Disallow: /admin`, `Disallow: /api`, `Host: https://pmb.unjani.ac.id`, sitemap |
| Jumlah `<loc>` sitemap | 24 |
| `fetchpriority="high"` di beranda | 0 |
| `Accept-Language: en` ke `/` | `307` → `https://pmb.unjani.ac.id/en` (deteksi bahasa aktif) |
| Baseline lint lokal | **18 warning, 0 error** (lihat catatan di bawah tabel) |

Output mentah (production, 5 November 2026, ±17.37 WIB; dijalankan sebelum perubahan Fase 1 dideploy):

```text
$ curl -sI http://pmb.unjani.ac.id/ | head -3
HTTP/1.1 200 OK
Server: nginx
Date: Thu, 05 Nov 2026 10:37:23 GMT
$ curl -sI https://www.pmb.unjani.ac.id/ | head -3
HTTP/1.1 301 Moved Permanently
Server: nginx
Date: Thu, 05 Nov 2026 10:37:23 GMT
$ curl -sI $P/ | grep -i -E "^(link|strict-transport-security):"
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Link: <http://pmb.unjani.ac.id/>; rel="alternate"; hreflang="id", <http://pmb.unjani.ac.id/en>; rel="alternate"; hreflang="en", <http://pmb.unjani.ac.id/>; rel="alternate"; hreflang="x-default"
Link: </_next/static/media/83afe278b6a6bb3c-s.p.2bn3s6zvc0dyp.woff2>; rel=preload; as="font"; crossorigin=""; type="font/woff2", </_next/static/media/fba5a26ea33df6a3-s.p.18rizl4rsrl42.woff2>; rel=preload; as="font"; crossorigin=""; type="f …[dipotong]
$ curl -s $P/ | grep -o "<title>[^<]*"
<title>PMB UNJANI
$ curl -s $P/robots.txt
User-Agent: *
Allow: /
Disallow: /admin
Disallow: /api

Host: https://pmb.unjani.ac.id
Sitemap: https://pmb.unjani.ac.id/sitemap.xml
$ curl -s $P/sitemap.xml | grep -c "<loc>"
24
$ curl -s $P/ | grep -c fetchpriority="high"
0
$ curl -s -o /dev/null -w "%{http_code} %{redirect_url}" -H "Accept-Language: en" $P/
307 https://pmb.unjani.ac.id/en
$ eslint . --ignore-pattern "node_modules-windows-backup/**"
✖ 18 problems (0 errors, 18 warnings)
  0 errors and 4 warnings potentially fixable with the `--fix` option.
```

Catatan:
- Baris `Link` kedua (preload font) dipotong karena panjang.
- Lint dijalankan lewat `node node_modules/eslint/bin/eslint.js` dengan `--ignore-pattern` untuk folder `node_modules-windows-backup/` (565 MB, tidak ada di repo). Tanpa itu `yarn lint` ikut memindainya dan tidak selesai dalam batas waktu.
- Jumlah 18 warning dicatat setelah kode Fase 1 ditulis. Fase 1 tidak menambah warning: lint terarah pada folder yang diubah hanya menampilkan 8 warning, semuanya di file yang tidak disentuh. Angka 18 juga sama dengan hasil lint rilis v1.4.1.

## Fase 1

Status 5 November 2026. Kode T.1.2 sampai T.1.9 sudah ditulis. Hanya cek yang bisa jalan tanpa server yang sudah dijalankan.

| Task | Status | Bukti |
|---|---|---|
| T.1.2 robots.txt | **lulus** (setara `curl`) | `resolveRobots()` bawaan Next (serializer yang sama dengan `/robots.txt`) pada isi `robots.ts` menghasilkan `Allow: /`, `Allow: /api/files/`, `Disallow: /admin`, `Disallow: /api`, `Sitemap: …`, tanpa baris `Host:`. Cek `curl $B/robots.txt` menyusul di T.1.11 |
| T.1.3 `buildMetadata` | **lulus** | assert `LULUS` (Node 25, type stripping), `tsc --noEmit` bersih |
| T.1.4 bahasa dan noindex | **lulus offline**, cek `curl` 1–6 diulang di T.1.11 | `routing.ts:8` `localeDetection: false` (opsi dikenal `next-intl/dist/.../routing/config.js`); `hanyaId: !judul_en?.trim()` di `pengumuman/[slug]` dan `artikel/[slug]`; assert `buildMetadata` (T.1.3) untuk `hanyaId` → `noindex` dan hreflang hanya `id`+`x-default`; assert `localizedEntries(path, data, adaEn)` dari `sitemap.ts` (ditranspilasi dengan `typescript`): `adaEn=false` hanya URL `id`, `true` memuat `/en/…` → `LULUS`; `tsc --noEmit` bersih. Belum diuji: integrasi dengan DB (butuh dev server dan data S1/S2) |
| T.1.5 title dan meta beranda | **lulus offline**, cek `curl` diulang di T.1.11 | Teks `home.metaTitleSufiks`, `home.metaDesc`, `pengumumanPage.metaDesc`, `kontakPage.metaDesc`, `artikelPage.metaDesc` (id dan en) dibandingkan otomatis dengan tabel SPEC §6.4: sama persis. `generateMetadata` beranda diuji dengan stub: `tahunAjaran` ada → `PMB UNJANI 2027/2028 – <sufiks>`; kosong → `PMB UNJANI – <sufiks>` (tanpa spasi ganda); DB mati (`connectDb` melempar) → tetap `PMB UNJANI – <sufiks>`; `openGraph.title` dan `twitter.title` sama dengan title → `LULUS`. Halaman `/kontak`, `/pengumuman`, `/artikel` memakai `t('metaDesc')`. `tsc --noEmit` bersih. Belum diuji: render nyata di dev (butuh DB) |
| T.1.6 structured data | **lulus offline**, cek `curl` diulang di T.1.11 | `grep -rn 'logo.svg' src` kosong. Assert `organizationJsonLd` (bentuk SPEC §6.5): `@type` `CollegeOrUniversity`, `@id` `<SITE_URL>/#organization`, `logo` = `LOGO_URL` (berakhir `/logo-pmb-unjani%20(1).png`, file ada di `public/`), alamat default saat settings kosong, `email`/`telephone` dihilangkan bila kosong, `sameAs` tanpa `pendaftaran.unjani.ac.id`, serialisasi tanpa karakter `<`. Pemeriksaan kode: `layout.tsx` memakai `<JsonLd data={[organizationJsonLd(settings), websiteJsonLd()]} />` tanpa `next/script`/`jsonld-org`; `/kontak` tidak lagi memanggil `organizationJsonLd`; Article dan NewsArticle memakai `LOGO_URL`, author `Organization`, `dateModified = max(publishedAt, updatedAt)` → `LULUS`. `tsc --noEmit` bersih. Belum diuji: HTML nyata (jumlah `CollegeOrUniversity` = 1 di `/` dan `/kontak`, `dateModified ≥ datePublished` pada artikel nyata) |
| T.1.7 markup jalur dan FAQ | **lulus offline**, cek `curl` dan cek manual browser tertunda | `JalurAccordion` dan `FAQAccordion` dirender ke HTML (`renderToStaticMarkup` + `NextIntlClientProvider`, pesan `id.json`) → `LULUS`: `>Persyaratan</h3>` = 0; `<h3><button` = jumlah jalur; judul persyaratan `Persyaratan Jalur PMDK` sebagai `h4` (default) atau `h3` (saat `tingkatJudul="h2"`, dengan `<h2><button`); `ringkasan` tiap jalur muncul 1 kali; tidak ada `<p>`/`<div>` di dalam `<button>`; anchor `id="<slug>"` tetap ada; `FAQAccordion` default memfilter per kategori, dan `tampilkanTab={false}` merender semua pertanyaan tanpa bar tab, tiap pertanyaan di `<h3><button>`. `Hero.tsx` tidak lagi memakai `CountUp` (`{jumlahFakultas}` dan `{jumlahProgramStudi}` polos). `tsc --noEmit` bersih. Belum diuji: HTML beranda nyata (`/tmp/b-dom.html`), dan buka/tutup accordion dengan mouse dan keyboard di browser |
| T.1.8 WhatsApp dan ejaan | **lulus offline**, cek `curl` diulang di T.1.11 | `grep -rn Universtas src` = 0 baris. `kontak/page.tsx:93` memakai `.replace(/\D/g, '').replace(/^0/, '62')`, ekspresi yang sama dengan `page.tsx:294`. Uji normalisasi: `0811-2497-890` → `628112497890`; `+62 811 2497 890` → `628112497890`; `628112497890` tetap; `(022) 6642 0070` → `622266420070` → `LULUS`. Tautan `wa.me` statis (`page.tsx:587`, `WhatsAppFloatingButton.tsx:7`) sudah berawalan `62`. Belum diuji: `curl $B/kontak` dengan nomor dari DB |
| T.1.9 `toSlug` | **lulus** | assert `LULUS` |
| T.1.10 `fetchpriority` | **lulus offline** (perubahan kode diperlukan), cek `curl` diulang di T.1.11 | `HeroSlider` dirender ke HTML (`renderToStaticMarkup`): sebelum perubahan `<img>` pertama **tanpa** atribut `fetchpriority` (hanya `priority`); sesudah menambah `fetchPriority={indeks === 0 ? 'high' : undefined}` → `<img … fetchPriority="high">` pada gambar indeks 0 saja. **Perhatian:** React menulis atribut ini dalam huruf kapital campuran (`fetchPriority`), sedangkan perintah `grep -c 'fetchpriority="high"'` di TODO/baseline peka huruf besar-kecil sehingga selalu 0. Pakai `grep -ic` pada T.1.11. Angka baseline 0 di atas karena itu belum tentu berarti production tanpa atribut. `tsc --noEmit` bersih |
| T.1.11 checkpoint | belum | - |

Lint pada folder yang diubah (`src/app`, `src/lib`, `src/i18n`, `src/components/public`): 0 error, 8 warning, semuanya di file yang tidak diubah.

Penghalang cek `curl`: `next dev` gagal dengan `No prebuild or local build of @parcel/watcher found. Tried @parcel/watcher-win32-x64`. `node_modules` tampaknya terpasang untuk platform lain, padahal ada folder `node_modules-windows-backup`. MongoDB lokal (27017) juga tidak aktif.

Catatan lint baseline (T.1.1): `yarn lint` (`eslint .`) ikut memindai `node_modules-windows-backup/`, sehingga sangat lambat dan angkanya tidak bermakna. Baseline perlu diukur ulang setelah folder itu dipindah atau di-ignore.

### T.1.11 Checkpoint Fase 1 — LULUS (6 November 2026)

Metode: salinan proyek di folder sementara (bukan folder proyek), dengan `node_modules` Windows dari `node_modules-windows-backup/` ditambah paket `qrcode` beserta dependensinya (salinan itu tidak punya `qrcode`; paketnya diambil dari `node_modules` proyek). Di salinan itu `src/lib/db.ts` ditambah `mongoose.set('autoIndex', false)` dan `autoCreate false` agar server tidak menulis indeks. Data dibaca dari cluster Atlas di `.env` secara **baca-saja**: tidak ada data yang diubah. Folder proyek tidak diubah, dan salinan `.env` dihapus setelah uji.

| Langkah | Hasil |
|---|---|
| `npx tsc --noEmit` | bersih |
| Lint (`--ignore-pattern "node_modules-windows-backup/**"`) | 0 error, 18 warning = baseline |
| `next build` (di salinan) | sukses (`Compiled successfully`, exit 0) |

Cek `curl` terhadap build production lokal (`next start`, port 9532):

| Task | Perintah / pengamatan | Hasil |
|---|---|---|
| T.1.2 | `/robots.txt` | `Allow: /`, `Allow: /api/files/`, `Disallow: /admin`, `Disallow: /api`; baris `Host:` = 0 |
| T.1.4 | `Accept-Language: en` ke `/` | `200` (bukan 307) |
| T.1.4 | `/en/pengumuman/mekanisme-ods` (pengumuman tanpa `judul_en`) | `<meta name="robots" content="noindex, nofollow">` |
| T.1.4 | `/pengumuman/mekanisme-ods`: `hreflang="en"` | 0; robots `index, follow` |
| T.1.4 | `/en/pengumuman/mekanisme-ods` di `sitemap.xml` | 0 |
| T.1.4 | `/en/artikel/kuliah-di-unjani-pilihan-tepat-untuk-masa-depan-yang-lebih-cerah` (artikel ber-`judul_en`) | `index, follow`, ada di sitemap (1) |
| T.1.5 | `<title>` `/` | `PMB UNJANI Tahun Akademik 2027/2028 – Pendaftaran Kuliah di Cimahi &amp; Bandung` |
| T.1.5 | `<title>` `/en` | `PMB UNJANI Tahun Akademik 2027/2028 – Study in Cimahi &amp; Bandung, Indonesia` |
| T.1.5 | meta description `/kontak` | teks SPEC §6.4 |
| T.1.6 | `CollegeOrUniversity` di `/` dan `/kontak` | 1 dan 1; `id="jsonld-org"` = 0 |
| T.1.6 | `/logo-pmb-unjani%20(1).png` | `200` |
| T.1.6 | artikel `pmb-unjani-20272028-pmdk-1-and-gelombang-1-dibuka` | `datePublished` = `dateModified` = `2026-11-04T06:00:00.000Z` (Modified ≥ Published) |
| T.1.7 | `>Persyaratan</h3>` | 0 |
| T.1.7 | `<h3><button` di beranda | 25 (14 jalur + 11 FAQ) |
| T.1.7 | statistik hero | `11` dan `48`, angka polos |
| T.1.8 | `wa.me/…` di `/kontak` | semua `wa.me/628112497890` |
| T.1.10 | `grep -ic 'fetchpriority="high"'` di beranda | 2 (≥ 1) |
| Regresi | `/`, `/en`, `/pengumuman`, `/artikel`, `/kontak`, `/admin/login` | semuanya `200` |

Cek manual di browser (Chrome): tiap tombol jalur dan FAQ membuka dan menutup dengan klik (`aria-expanded` `false → true → false`); fokus lewat keyboard lalu Enter membuka accordion jalur; `Persyaratan <nama jalur>` dirender sebagai `h4` (12 judul).

Catatan dan temuan:
1. **Title beranda** memuat `Tahun Akademik 2027/2028`, bukan `2027/2028`, karena isi `PageContent` hero `tahunAjaran` di DB adalah `Tahun Akademik 2027/2028`. Kode mengikuti SPEC. Kalau ingin title seperti contoh SPEC, ubah field itu di admin menjadi `2027/2028` (pekerjaan konten, bukan kode).
2. **Sitemap** 17 `<loc>` (baseline production 24): selisih 7 adalah varian `/en` untuk pengumuman/artikel tanpa `judul_en`, sesuai D-07.
3. **Kalkulator** menampilkan keadaan kosong ("Biaya pendidikan sedang disusun"), sama persis dengan production, karena biaya 2027/2028 belum diinput (T.3.4, D-04). Kode kalkulator tidak diubah di Fase 1, tetapi proses menghitung **tidak dapat diuji** sampai data biaya ada. T.2.0 membandingkan HTML section kalkulator sebelum/sesudah ekstraksi.
4. T.1.4 diuji dengan pasangan nyata (pengumuman `mekanisme-ods` tanpa terjemahan, artikel ber-`judul_en`), bukan slug `S1`/`S2` dari TODO.
5. Tidak diuji karena memerlukan menulis data di DB bersama: skenario data kosong (T.2.1, T.2.3, T.2.4) dan MongoDB mati (T.2.7).

## Fase 2

### T.2.0 Ekstrak data biaya (6 November 2026)

- Dibuat `src/lib/dataBiaya.ts`: `muatDataBiaya(acuan)` dan `muatKalkulatorKosong(locale)`. Isinya dipindah apa adanya dari `page.tsx`. Beranda sekarang memanggil keduanya. Import `Biaya`/`Kelas`/tipe kalkulator yang tak terpakai dibuang dari `page.tsx`.
- `tsc --noEmit` bersih; eslint pada `page.tsx` dan `dataBiaya.ts`: 0 masalah.
- Section `#kalkulator` beranda sebelum dan sesudah (build production di salinan, DB Atlas baca-saja): `diff` kosong, keduanya 2354 byte. `/en` juga `200`.
- **Terbatas:** data biaya aktif di DB saat ini kosong, jadi hanya jalur keadaan kosong yang teruji. Jalur dengan data (records, `prodiOptions`, peta) tidak diuji; kodenya disalin tanpa perubahan logika. Ulangi diff ini setelah biaya 2027/2028 diinput (T.3.4).

### T.2.1 `/biaya-kuliah` dan `TabelBiaya` (6 November 2026)

Dibuat: `biaya-kuliah/page.tsx`, `components/public/TabelBiaya.tsx`, kunci `biayaPage.*` (id dan en, persis SPEC §6.4). `tsc` dan eslint bersih. Diuji dengan `next dev` di salinan (DB Atlas baca-saja).

| Cek | Hasil |
|---|---|
| `/biaya-kuliah`, `/en/biaya-kuliah` | `200`, `200` |
| `<h1` | 1 (id dan en) |
| `<title>` | `Biaya Kuliah UNJANI per Program Studi — PMB UNJANI`; en: `UNJANI Tuition Fees by Study Program — PMB UNJANI` |
| canonical | `https://pmb.unjani.ac.id/biaya-kuliah`; en: `.../en/biaya-kuliah` |
| BreadcrumbList | ada |
| Data kosong (DB nyata: nol biaya aktif) | `200`, `<table` = 0, `/api/files/` ada (dokumen biaya tetap tampil) |
| Dengan data (**data contoh** disuntik hanya di salinan lewat env) | 1 `<table>`, caption, 6 kolom, 2 baris urut prodi→jalur→kelas (kelas kosong `—` lebih dulu), format `Rp 5.000.000`, semester kosong `—` |

Catatan: cek "nonaktifkan semua jadwal" tidak dijalankan (butuh menulis ke DB bersama); keadaan kosong terbukti dari DB nyata yang memang tanpa biaya aktif. Data contoh bukan data produksi.

### T.2.2 `/jalur-masuk` (6 November 2026)

`jalur-masuk/page.tsx` baru (memakai `JalurList tingkatJudul="h2"`), `jalurPage.metaTitle`/`metaDesc` sesuai SPEC §6.4. `tsc` bersih. Diuji dengan `next dev` di salinan (DB Atlas baca-saja, data nyata).

| Cek | Hasil |
|---|---|
| `/jalur-masuk`, `/en/jalur-masuk` | `200`, `200` |
| `<h1` | 1 |
| `<h2><button` (HTML tanpa script) | 14 = jumlah jalur aktif (beranda: 14 `<h3><button`) |
| anchor `<article id="<slug>">` | 14 (cek gulir di browser tidak dijalankan; anchor sama dengan yang dipakai beranda) |
| title | `Jalur Masuk UNJANI dan Persyaratannya — PMB UNJANI`; en: `UNJANI Admission Paths and Requirements — PMB UNJANI` |
| canonical | `https://pmb.unjani.ac.id/jalur-masuk` |

### T.2.3 `/jadwal-pmb` (6 November 2026)

`jadwal-pmb/page.tsx` baru; kolom status `JadwalTable` kini memakai `statusJadwal()` (`berjalan` → `sedangBerlangsung`, `akan-datang` → `mulaiDalam` dengan `hariMenujuMulai`, selain itu `—`); kunci `jadwalPage.metaTitle`/`metaDesc` (SPEC §6.4) dan `jadwalPage.status` (kunci ini sebelumnya tidak ada, header kolom memakai fallback yang tidak pernah jalan). `tsc` dan eslint bersih. Diuji dengan `next dev` di salinan (DB Atlas baca-saja, data nyata).

| Cek | Hasil |
|---|---|
| `/jadwal-pmb`, `/en/jadwal-pmb` | `200`, `200` |
| `<h1` | 1 |
| title | `Jadwal PMB dan Gelombang Pendaftaran — PMB UNJANI`; en: `Admission Schedule and Registration Waves — PMB UNJANI` |
| canonical | `https://pmb.unjani.ac.id/jadwal-pmb` |
| tabel | 2 baris nyata (Periode PMDK 2027, APOTEKER GENAP 2026/2027 GELOMBANG 1), status `Sedang berlangsung` (en: `In progress`) |

Tidak teruji: label `Mulai dalam N hari` (tidak ada jadwal yang akan datang di DB) dan keadaan kosong `Belum ada jadwal dipublikasikan.` (butuh menonaktifkan jadwal di DB bersama). Cabang kosong adalah kode lama `JadwalTable` yang tidak diubah.
