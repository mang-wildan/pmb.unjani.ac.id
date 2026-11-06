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

### T.2.4 `/faq` dan FAQPage JSON-LD (6 November 2026)

`faq/page.tsx` baru (per kategori: `<h2>` + `FAQAccordion tampilkanTab={false}`), `faqPageJsonLd()` di `seo.ts`, kunci `faqPage.*` (SPEC §6.4). `tsc` dan eslint bersih. Assert `faqPageJsonLd([]) === null` dan `...mainEntity[0].acceptedAnswer.text === "A"` → `LULUS` (sebelum implementasi tidak dijalankan: fungsi belum ada, jadi pasti gagal). `next dev` di salinan, DB Atlas baca-saja, data nyata.

| Cek | Hasil |
|---|---|
| `/faq`, `/en/faq` | `200`, `200` |
| `<h1` | 1 |
| title | `Pertanyaan Seputar Pendaftaran (FAQ) — PMB UNJANI`; en: `Admissions FAQ — PMB UNJANI` |
| canonical | `https://pmb.unjani.ac.id/faq` |
| `"@type":"FAQPage"` | 1 |
| `"@type":"Question"` | 22 |
| `<h3><button` (HTML tanpa script) | 22 = jumlah Question; `<h2` = 3 kategori; tanpa bar tab |

Tidak teruji: keadaan kosong (nol FAQ aktif, butuh menonaktifkan data di DB bersama). Kodenya: `faqPageJsonLd([])` mengembalikan `null` (teruji) dan halaman tidak menyertakan JSON-LD itu serta tidak merender kategori kosong.

### T.2.5 Hapus folder lama dan `redirects()` (6 November 2026) `[SEO-IRREVERSIBLE]`

Folder `jalur-seleksi/`, `biaya-pendidikan/`, `jadwal/` dihapus (isinya hanya stub `permanentRedirect('/')`). `next.config.mjs` mendapat `async redirects()` berisi 14 rule SPEC §6.3, semua `permanent: true`. Cadangan: riwayat git (folder bisa dikembalikan dari commit sebelumnya), jadi zip tidak dibuat. Efek permanen di browser/Google baru terjadi setelah deploy (T.4.1).

`tsc` bersih (setelah `.next/types` usang dihapus; berkas itu hasil generate yang masih merujuk folder lama). Diuji dengan `next dev` di salinan:

```text
OK /jalur-seleksi
OK /en/jalur-seleksi
OK /biaya-pendidikan
OK /en/biaya-pendidikan
OK /jadwal
OK /en/jadwal
OK /prodi
OK /infomasi-biaya
OK /semuajalur
OK /jalur-lanjutan
OK /jalur-pmdk-3
OK /jalur-magister
OK /jalur-ods
OK /jadwal-pmb-september
/jadwal/ -L:      200, 2 redirect
/en/jadwal/ -L:   200, 2 redirect, berakhir di /en/jadwal-pmb
/kalkulator:      308 -> / (stub D-11 tidak berubah)
/halaman-tidak-ada-xyz: 404
/admin/jalur-seleksi:   307 -> /admin/login (admin tidak terpengaruh)
```

### T.2.6 Internal link dan sitemap (6 November 2026)

Navbar (`/jalur-masuk`, `/biaya-kuliah`), Footer kolom Informasi (`/biaya-kuliah`, `/jalur-masuk`, `/jadwal-pmb`, `/faq`), tautan di bawah section beranda (jalur, jadwal, kalkulator, FAQ), dan empat rute baru di `sitemap.ts`. Kunci baru: `home.biayaLink`, `home.faqLink`, `footer.faq`. Tombol hero "Hitung Biaya" tetap `/#kalkulator` (D-03). `tsc` dan eslint bersih. Diuji dengan `next dev` di salinan (DB Atlas baca-saja).

| Cek | Hasil |
|---|---|
| `sitemap.xml`: `/(biaya-kuliah\|jalur-masuk\|jadwal-pmb\|faq)</loc>` | 8 |
| `/kontak`: `href="/#jalur"` atau `href="/#kalkulator"` | 0 |
| beranda: `href="/(jalur-masuk\|jadwal-pmb\|biaya-kuliah\|faq)"` unik | 4 baris |
| `/en`: `href="/en/jalur-masuk"` | 2; `href="/en/faq"` ada |
| tombol hero `/#kalkulator` | masih ada (D-03) |
| `/` dan `/en` | `200` |

Catatan: satu run dev sempat `500` karena `next/font/google` gagal mengambil font (galat jaringan `Module not found: @vercel/turbopack-next/internal/font/google/font`); run ulang `200` tanpa perubahan kode.

### T.2.7 Checkpoint Fase 2 (6 November 2026)

**1. Statis dan build**
- `npx tsc --noEmit`: bersih.
- Lint (`--ignore-pattern "node_modules-windows-backup/**"`): 0 error, 18 warning = baseline.
- `next build` (salinan, `node_modules` Windows): sukses setelah dua percobaan pertama gagal karena RAM mesin habis (`FATAL ERROR: ... out of memory`, sisa RAM 0,3 GB). Bukan masalah kode; percobaan ketiga lulus tanpa perubahan apa pun.

**2. Semua cek T.1.x dan T.2.x terhadap build production lokal (`next start`, DB Atlas baca-saja)**

```text
/ 200
/en 200
/pengumuman 200
/artikel 200
/kontak 200
/admin/login 200
/biaya-kuliah 200
/en/biaya-kuliah 200
/jalur-masuk 200
/en/jalur-masuk 200
/jadwal-pmb 200
/en/jadwal-pmb 200
/faq 200
/en/faq 200
T.1.2 robots: allow-files=1 disallow-api=1 host=0
T.1.4 accept-lang en: 200
T.1.4 /en/pengumuman/mekanisme-ods: <meta name="robots" content="noindex, nofollow"; di sitemap: 0; hreflang-en di versi id: 0
T.1.4 /en/artikel/kuliah-di-unjani-...: <meta name="robots" content="index, follow"; di sitemap: 1
T.1.5 title id: <title>PMB UNJANI Tahun Akademik 2027/2028 – Pendaftaran Kuliah di Cimahi &amp; Bandung
T.1.5 title en: <title>PMB UNJANI Tahun Akademik 2027/2028 – Study in Cimahi &amp; Bandung, Indonesia
T.1.6 org home=1 kontak=1 jsonld-org=0 logo=200
T.1.7 Persyaratan-h3=0 h3button=25 dd=11 48 
T.1.8 wa: wa.me/628112497890 
T.1.10 fetchpriority -ic: 2
T.2.1 biaya: h1=1 title=<title>Biaya Kuliah UNJANI per Program Studi — PMB UNJANI table=0 files=1
T.2.2 jalur-masuk: h1=1 h2button=14
T.2.3 jadwal-pmb: h1=1 status-label=6
T.2.4 faq: h1=1 FAQPage=1 Question=22 h3button=22
T.2.6 sitemap 4 rute=8 kontak-anchor=0 beranda-link=4 en-jalur=2
T.2.5 redirect OK: 14/14; /jadwal/ -L: 200 2; /en/jadwal/ -L: http://localhost:9532/en/jadwal-pmb; kalkulator: 308; 404: 404
```

**3. Fokus review butir 1, 2, 3, 5**
- Butir 1 (slug idempoten): assert T.1.9 `LULUS`.
- Butir 2 (redirect): 14/14 rule `308`; `/jadwal/` tiba dalam 2 hop; `/en/jadwal/` berakhir di `/en/jadwal-pmb`; tidak ada loop.
- Butir 3 (data kosong): `/biaya-kuliah` dengan nol biaya aktif (data nyata) `200` tanpa `<table`; jadwal dan FAQ kosong terbukti lewat uji DB mati di bawah (halaman `200`, tanpa `FAQPage`, `Belum ada jadwal dipublikasikan.`).
- Butir 5 (`/en` tanpa `judul_en`): `noindex` dan keluar dari sitemap; konten ber-`judul_en` tetap `index` dan ada di sitemap.

**4. MongoDB mati** (disimulasikan: `MONGO_URI` dan `MONGO_DIRECT_URI` diarahkan ke `mongodb://127.0.0.1:1/x`, bukan mematikan DB bersama)
- Percobaan pertama: empat halaman baru `200`, tetapi **`/` 500** (`MongooseError: Operation \`jalurseleksis.find()\` buffering timed out after 10000ms`). Penyebab: 6 query lama di `Promise.all` beranda tanpa `.catch`.
- Perbaikan: `.catch(() => [])`/`.catch(() => null)` pada `JalurSeleksi`, `Jadwal` aktif, `Dokumen` biaya, `Dokumen` manual, `Pengumuman`, `PageContent` hero di `page.tsx`.
- Setelah perbaikan: `/`, `/en`, `/biaya-kuliah`, `/jalur-masuk`, `/jadwal-pmb`, `/faq` semuanya `200`.

**5. Regresi manual** (Chrome, build production lokal)
- Desktop (lebar 1070): beranda tampil normal; section `hero`, `jalur`, `jadwal`, `kalkulator`, `program-studi` ada; navbar menuju `/#manual-book`, `/jalur-masuk`, `/biaya-kuliah`, `/pengumuman`, `/kontak`, portal pendaftaran; footer menuju `/biaya-kuliah`, `/jalur-masuk`, `/jadwal-pmb`, `/faq`, `/pengumuman`, `/kontak`; accordion jalur membuka (`aria-expanded` `true`); kalkulator dalam keadaan kosong seperti production; `/admin/login` `200`.
- **Belum dilakukan:** tampilan ponsel, klik language switcher, dan popup (tidak ada popup aktif saat uji). Ekstensi Chrome gagal tiga kali ("tab not in group"), jadi dihentikan. Perlu dicek manusia sebelum T.4.1.

- Tampilan ponsel, language switcher, dan popup: dinyatakan aman oleh pemilik (6 November 2026).

## Fase 4

### T.4.1 Deploy production (6 November 2026)

- Server: `/www/wwwroot/pmb.unjani.ac.id` (aaPanel). Aplikasi **tidak** dijalankan pm2 `pmb-unjani` seperti di TODO, tetapi oleh Node Project aaPanel `PMB_UNJANI` (`/www/server/nodejs/vhost/scripts/PMB_UNJANI.sh`, user `www`, port 9532, Node v22.14.0). Proses pm2 `pmb-unjani1` berstatus stopped dan tidak dipakai.
- Cadangan rollback: `/www/wwwroot/pmb.unjani.ac.id.bak-20261106` (dibuat pemilik sebelum deploy).
- Kode baru disalin dan `yarn build` dijalankan oleh pemilik (build 6 Nov 2026 15:35, memuat `/[locale]/biaya-kuliah`, `/faq`, `/jadwal-pmb`, `/jalur-masuk`).
- Masalah saat deploy: build dijalankan sebagai `root`, sehingga `.next` milik `root`, sedangkan proses berjalan sebagai `www` (log: `EACCES ... mkdir .next/server/route-cache`). Perbaikan: `chown -R www:www .next`.
- Restart: proses lama (berjalan sejak 9 Okt 2026, PID 2714283/2714299) dihentikan, lalu `PMB_UNJANI.sh` dijalankan ulang sebagai `www` (PID baru 2487683, 15:40). `.env` dan `uploads/` tidak disentuh.
- Smoke test dari server (`127.0.0.1:9532`): `/`, `/biaya-kuliah`, `/jalur-masuk`, `/jadwal-pmb`, `/faq`, `/admin/login` semuanya `200`.

Verifikasi dari luar (`https://pmb.unjani.ac.id`):

```text
/ 200
/en 200
/biaya-kuliah 200
/en/biaya-kuliah 200
/jalur-masuk 200
/en/jalur-masuk 200
/jadwal-pmb 200
/en/jadwal-pmb 200
/faq 200
/en/faq 200
/pengumuman 200
/artikel 200
/kontak 200
/admin/login 200
robots: allow-files=1 host=0
accept-lang en: 200
title id: <title>PMB UNJANI Tahun Akademik 2027/2028 – Pendaftaran Kuliah di Cimahi &amp; Bandung
title en: <title>PMB UNJANI Tahun Akademik 2027/2028 – Study in Cimahi &amp; Bandung, Indonesia
sitemap total: 25 4rute: 8 en-ods: 0
en/pengumuman/mekanisme-ods: <meta name="robots" content="noindex, nofollow"
org home: 1 kontak: 1 logo: 200
fetchpriority -ic: 2 h3button: 25 Persyaratan-h3: 0
wa: wa.me/628112497890 
biaya title: <title>Biaya Kuliah UNJANI per Program Studi — PMB UNJANI
jalur-masuk h2button: 14
faq: FAQPage=1 Question=22
kontak anchor lama: 0 beranda link: 4
redirect OK 14/14; /jadwal/ -L: 200 2; kalkulator: 308; 404: 404
```

Catatan untuk deploy berikutnya: jalankan `yarn build` sebagai `www` (atau `chown -R www:www .next` setelahnya), lalu restart lewat aaPanel (Node Project `PMB_UNJANI`), bukan `pm2 restart pmb-unjani`. Folder server belum repo git; kode disalin manual.

## Fase 3

### T.3.0 nginx: HTTPS dan apex satu hop (6 November 2026)

Diterapkan pemilik di aaPanel:
- `www.pmb.unjani.ac.id.conf`: blok `if ($uri !~ "^/\.well-known/") { return 301 https://pmb.unjani.ac.id$request_uri; }` di awal `server`; include redirect lama (`return 301 http://pmb.unjani.ac.id...`) dikomentari.
- `node_PMB_UNJANI.conf`: `http` → `https://pmb.unjani.ac.id$request_uri` (301, kecuali `/.well-known/`), plus `proxy_set_header X-Forwarded-Proto $scheme;`.

Verifikasi dari luar:

```text
$ curl -sI http://pmb.unjani.ac.id/kontak
HTTP/1.1 301 Moved Permanently
Location: https://pmb.unjani.ac.id/kontak
$ curl -sI http://www.pmb.unjani.ac.id/kontak
HTTP/1.1 301 Moved Permanently
Location: https://pmb.unjani.ac.id/kontak
$ curl -sI https://www.pmb.unjani.ac.id/kontak
HTTP/1.1 301 Moved Permanently
Location: https://pmb.unjani.ac.id/kontak
$ curl -sI http://pmb.unjani.ac.id/
HTTP/1.1 301 Moved Permanently
Location: https://pmb.unjani.ac.id/
$ curl -sI https://www.pmb.unjani.ac.id/
HTTP/1.1 301 Moved Permanently
Location: https://pmb.unjani.ac.id/
$ curl -sI http://www.pmb.unjani.ac.id/biaya-kuliah?x=1
HTTP/1.1 301 Moved Permanently
Location: https://pmb.unjani.ac.id/biaya-kuliah?x=1
$ curl -sL (jumlah hop)
http://pmb.unjani.ac.id/kontak -> 200 hops=1 https://pmb.unjani.ac.id/kontak
http://www.pmb.unjani.ac.id/kontak -> 200 hops=1 https://pmb.unjani.ac.id/kontak
https://www.pmb.unjani.ac.id/kontak -> 200 hops=1 https://pmb.unjani.ac.id/kontak
$ curl -sI https://pmb.unjani.ac.id/
HTTP/1.1 200 OK
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Link: <https://pmb.unjani.ac.id/>; rel="alternate"; hreflang="id", <https://pmb.unjani.ac.id/en>; rel="alternate"; hreflang="en", <https://pmb.unjani.ac.id/>; rel="alternate"; hreflang="x-default"
well-known http: 404 
well-known www http: 301 https://pmb.unjani.ac.id/.well-known/acme-challenge/tes
https / 200
https /biaya-kuliah 200
https /faq 200
https /admin/login 200
```

Hasil:
- `http://pmb…`, `http://www.pmb…`, `https://www.pmb…` → `301` ke `https://pmb.unjani.ac.id/<path>` dalam **1 hop**; query string ikut.
- `https://pmb.unjani.ac.id/` `200` dengan `strict-transport-security`.
- Header `Link` hreflang kini memakai `https://` (temuan baseline T.1.1 selesai berkat `X-Forwarded-Proto`).
- `/.well-known/` di apex tidak dialihkan (404 untuk file uji yang memang tidak ada). Di `www`, file uji yang tidak ada berakhir 301; file tantangan ACME yang benar-benar ada dilayani lebih dulu oleh blok Lua aaPanel (`well-known/www.pmb.unjani.ac.id.conf`) sehingga perpanjangan SSL www tidak terhalang.

### T.4.2 Verifikasi production dan Search Console (6 November 2026) — SEBAGIAN

**1. Kriteria terima SPEC §5 terhadap `https://pmb.unjani.ac.id`: semua lulus**

```text
== FR-SEO-01
http://pmb.unjani.ac.id/kontak -> 301 https://pmb.unjani.ac.id/kontak
http://www.pmb.unjani.ac.id/kontak -> 301 https://pmb.unjani.ac.id/kontak
https://www.pmb.unjani.ac.id/kontak -> 301 https://pmb.unjani.ac.id/kontak
HSTS: 1
== FR-SEO-02
redirect 14/14; /en/jadwal -L: https://pmb.unjani.ac.id/en/jadwal-pmb; /jadwal/ -L: 200 2; 404: 404
== FR-SEO-03
User-Agent: *
Allow: /
Allow: /api/files/
Disallow: /admin
Disallow: /api

Sitemap: https://pmb.unjani.ac.id/sitemap.xml
== FR-SEO-04
title id: <title>PMB UNJANI Tahun Akademik 2027/2028 – Pendaftaran Kuliah di Cimahi &amp; Bandung
title en: <title>PMB UNJANI Tahun Akademik 2027/2028 – Study in Cimahi &amp; Bandung, Indonesia
kontak x-default: 
kontak og:locale: property="og:locale" content="id_ID" en: property="og:locale" content="en_US"
Accept-Language en: 200
/en/pengumuman/mekanisme-ods: <meta name="robots" content="noindex, nofollow"; sitemap: 0
artikel ber-judul_en: <meta name="robots" content="index, follow"; sitemap: 1
== FR-SEO-05
logo.svg di beranda: 0 org home: 1 kontak: 1
artikel /artikel/pmb-unjani-20272028-pmdk-1-and-gelombang-1-dibuka: "datePublished":"2026-11-04T06:00:00.000Z" "dateModified":"2026-11-04T06:00:00.000Z"  author: "author":{"@type":"Organization"
== FR-SEO-06
Persyaratan-h3: 0 h3button: 25 dd: 11 48  fetchpriority -ic: 2
== FR-SEO-07
wa: wa.me/628112497890 
== FR-SEO-09
/biaya-kuliah 200/en=200 h1=1 canon="https://pmb.unjani.ac.id/biaya-kuliah" title=Biaya Kuliah UNJANI per Program Studi — PMB UNJANI bc=1
/jalur-masuk 200/en=200 h1=1 canon="https://pmb.unjani.ac.id/jalur-masuk" title=Jalur Masuk UNJANI dan Persyaratannya — PMB UNJANI bc=1
/jadwal-pmb 200/en=200 h1=1 canon="https://pmb.unjani.ac.id/jadwal-pmb" title=Jadwal PMB dan Gelombang Pendaftaran — PMB UNJANI bc=1
/faq 200/en=200 h1=1 canon="https://pmb.unjani.ac.id/faq" title=Pertanyaan Seputar Pendaftaran (FAQ) — PMB UNJANI bc=1
biaya table: 0 (nol biaya aktif) files: 1
faq FAQPage: 1 Question: 22
== FR-SEO-10
sitemap 4 rute: 8 kontak anchor lama: 0
```

Tambahan (atribut React ditulis `hrefLang`, jadi grep harus `-i`):
- `/kontak`: `<link rel="alternate" hrefLang="x-default" href="https://pmb.unjani.ac.id/kontak"/>` ada.
- `/pengumuman/mekanisme-ods` (tanpa `judul_en`): hanya `hrefLang="id"` dan `x-default`, tanpa `en`.
- Artikel ber-`judul_en`: `hrefLang="en"` ada.
- Title memuat `Tahun Akademik 2027/2028` karena isi field hero `tahunAjaran` (lihat T.1.11).

**2. Rich Results Test**
- `/faq`: **2 item valid terdeteksi** (FAQ dan breadcrumb), tanpa error. Di-crawl 6 Nov 2026 15.56.
- `/artikel/pmb-unjani-20272028-pmdk-1-and-gelombang-1-dibuka` (diulang pemilik, di-crawl 6 Nov 2026 15.58.42): **3 item valid** (Artikel, Breadcrumb, Organisasi), tanpa error. Percobaan pertama sempat "Gagal meng-crawl" (sementara).
- `/pengumuman/mekanisme-ods` (pemilik, di-crawl 6 Nov 2026 15.58.48): **3 item valid** (Artikel, Breadcrumb, Organisasi), tanpa error.
- Artikel dan Organisasi menampilkan "Masalah non-kritis terdeteksi" (properti opsional yang disarankan Google). Bukan error; tidak menghalangi hasil multimedia.

**3. Search Console: belum (pemilik)**
- Kirim ulang `https://pmb.unjani.ac.id/sitemap.xml`.
- URL Inspection → Request indexing untuk `/biaya-kuliah`, `/jalur-masuk`, `/jadwal-pmb`, `/faq`.
- Catat daftar 404 dari laporan Pages.
