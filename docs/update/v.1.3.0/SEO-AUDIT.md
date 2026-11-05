# Audit SEO Teknis — PMB Unjani

Audit dari kode saja (tanpa Search Console, tanpa lab test performa). Versi kode: 1.2.0. Build production terakhir yang ada di folder: BUILD_ID `Iqk0mnbzvI0lTpBV7k9zt2` (.next/, tertanggal 30 Mei 2026). Tidak ada angka skor/ranking/volume — tidak ada datanya.

## Bagian 1 — Status per Poin Checklist

### A. Fondasi

| Poin | Status | Bukti |
|---|---|---|
| Title & meta description | Per halaman. Root: template `%s — PMB UNJANI` + default description; landing: title absolute + deskripsi khusus; pengumuman/[slug]: dinamis dari `metaTitle`/`judul` + fallback bertingkat | src/app/layout.tsx:23-29; src/app/[locale]/(public)/page.tsx:41-48; …/pengumuman/[slug]/page.tsx:15-34; src/lib/seo.ts:12-45 |
| Struktur heading | Landing: 1×H1 (Hero) + H2 per section (SectionHeading). [slug]: 1×H1. **`/pengumuman` & `/kontak`: TANPA H1** (lihat SEO-05) | src/components/public/Hero.tsx:50; src/components/ui/Card.tsx:62; grep `<h1` |
| URL | Bersih & deskriptif: slug lowercase unik (`/pengumuman/<slug>`), tanpa id/query. Slug digenerate slugify | src/models/Pengumuman.ts:7; package.json:40 |
| robots.txt | Ada, dinamis: allow `/`, disallow `/admin` & `/api`, tautan sitemap + host | src/app/robots.ts:4-9 |
| sitemap.xml | Ada, dinamis: 3 URL statis + maks 200 pengumuman aktif dengan lastModified. Tanpa URL locale `/en` (lihat SEO-02) | src/app/sitemap.ts:6-30 |
| Canonical | Ada di semua halaman via `alternates.canonical` (absolut, berbasis `NEXT_PUBLIC_SITE_URL`) | src/lib/seo.ts:21,27 |
| Redirect duplikasi | trailing slash: normalisasi default Next (config tidak menyetel `trailingSlash`/`skipTrailingSlashRedirect` — next.config.mjs). www/non-www & http→https: level web server (Nginx) — **UNKNOWN dari kode**; HSTS sudah dikirim dari app (next.config.mjs `Strict-Transport-Security`). 5 halaman lama → `permanentRedirect('/')` (308) — konsolidasi ke landing | next.config.mjs:27-38; src/app/[locale]/(public)/jadwal/page.tsx:1-5 |

### B. Rendering & Indeksabilitas

| Poin | Status | Bukti |
|---|---|---|
| SSR/CSR | Semua halaman publik = React Server Component: query Mongoose langsung di server; landing ISR `revalidate = 60`; [slug] `force-dynamic`. HTML konten lengkap sejak respons pertama — **bukan CSR** | src/app/[locale]/(public)/page.tsx:39,66-80; …/[slug]/page.tsx:12-13,44-46 |
| Halaman admin | Client component, tapi diblok robots (`disallow /admin`) dan redirect login — tidak relevan indeks | src/app/robots.ts:6; src/proxy.ts:98-113 |
| Konten muncul setelah JS | Konten ADA di HTML awal, tapi section landing dibungkus `Reveal` dengan `opacity-0` sampai IntersectionObserver jalan (lihat SEO-06). JSON-LD Organization/WebSite juga baru disuntik setelah hidrasi (lihat SEO-07). Feed Instagram di-fetch server-side (bukan client) | src/components/public/Reveal.tsx:44-48; src/app/layout.tsx:82-93; src/app/[locale]/(public)/page.tsx:50-64 |

### C. Data Terstruktur & Sosial

| Poin | Status | Bukti |
|---|---|---|
| Schema.org | Organization (`CollegeOrUniversity`) + WebSite di root; BreadcrumbList di landing, /pengumuman, /kontak, [slug]; **NewsArticle** di [slug] dengan datePublished | src/lib/seo.ts:47-83; src/app/[locale]/(public)/pengumuman/[slug]/page.tsx:91-106 |
| Open Graph & Twitter Card | Lengkap di semua halaman via `buildMetadata` (og:type/url/title/description/image 1200×630, twitter summary_large_image). **TAPI file gambar default tidak ada** (SEO-01) | src/lib/seo.ts:29-43 |
| Favicon | Ada (`/favicon.ico`, juga dipakai sebagai apple-touch) — ukuran 270KB (SEO-09) | src/app/layout.tsx:41-45; public/favicon.ico |
| lang attribute | Dinamis `<html lang={locale}>` (id/en) | src/app/layout.tsx:64 |
| hreflang | **Tidak ada sama sekali**; canonical halaman EN menunjuk URL versi ID (SEO-02) | grep `hreflang|languages` nihil; src/lib/seo.ts:21,27 |

### D. Performa (indikasi dari kode; skor CWV riil = UNKNOWN, butuh lab/field test)

| Poin | Status | Bukti |
|---|---|---|
| Gambar | Komponen memakai `next/image` (optimasi otomatis) kecuali `<img>` mentah di LandingPopup. Slide hero pertama `priority` (baik untuk LCP). **File sumber berat**: public/uploads/hero total 8,0MB, ada JPG 1,0MB & duplikat identik 3×549KB; logo 465KB (SEO-10) | grep `<img` → hanya LandingPopup.tsx:117,125; src/components/public/HeroSlider.tsx:35; ls public/uploads/hero |
| Lazy loading | Default `next/image` = lazy kecuali `priority`; `<img>` LandingPopup tanpa atribut loading | src/components/public/HeroSlider.tsx:35; LandingPopup.tsx:117-125 |
| Bundle JS/CSS | Build production ada: .next/static total ±3,0MB; chunk terbesar 372KB, 224KB, 136KB (terminifikasi default Next). Font Awesome all.min.css 76KB diimpor global di root layout untuk semua halaman (SEO-11) | du .next/static; src/app/layout.tsx:5 |
| Font | `next/font/google` (Inter + Plus Jakarta Sans) dengan `display: swap` — self-hosted, non-blocking | src/app/layout.tsx:10-21 |
| Kompresi & cache | `compress: true` (gzip) di app; header dari config hanya security (tanpa Cache-Control kustom); `/api/files/[id]` Cache-Control 300 detik; cache CDN/Nginx production: UNKNOWN | next.config.mjs:41-56; src/app/api/files/[id]/route.ts:48 |

### E. Pendukung SEM

| Poin | Status | Bukti |
|---|---|---|
| Analytics | GA4 via gtag.js, ID diambil dari Settings admin atau env `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID`; hanya `gtag('config')` dasar. GTM tidak dipakai. **Apakah ID terisi di production: UNKNOWN** (tidak ada di .env.example; nilai Settings butuh akses DB) | src/app/layout.tsx:60-78; grep .env.example nihil |
| Verifikasi GSC | Mekanisme ada (Settings/env → meta verification). Terisi atau tidak: UNKNOWN | src/app/[locale]/(public)/layout.tsx:8-20 |
| Event konversi | **Tidak ada satu pun** `gtag('event')`/`dataLayer.push` di luar init (SEO-03) | grep nihil |
| UTM | **Tidak ada kode** yang membaca/meneruskan parameter UTM, termasuk ke link pendaftaran eksternal (SEO-04) | grep `utm` nihil |
| CTA landing | Jelas: "Daftar Sekarang" (Hero, target `pendaftaran.unjani.ac.id`, tab baru), CTA sekunder "Hitung Biaya" (#kalkulator), tombol daftar melayang mobile + WhatsApp. **Tidak terukur** — tanpa event tracking | src/components/public/Hero.tsx:59-75; DaftarFloatingButton.tsx:22-33 |

### F. Aksesibilitas Berdampak SEO

| Poin | Status | Bukti |
|---|---|---|
| Alt text | Semua pemakaian gambar punya atribut `alt` (Footer 2, Navbar 2, HeroSlider 1, InstagramFeed 1, LandingPopup 2). Nilai alt popup dari DB `Popup.alt` yang default `''` → bisa kosong (SEO-12) | grep `alt=`; src/models/Popup.ts:6 |
| Label form | Form admin: semua input dibungkus `<label>` via komponen Field (error ber-`role="alert"`); SearchableSelect ikut pola sama | src/components/admin/Field.tsx:17-38 |
| Kontras teks | UNKNOWN — perlu uji alat (palet kustom `brand`/`ink` di tailwind.config.ts:8-36; ada teks `text-ink-soft/60` untuk placeholder, Field.tsx:44) | — |

## Bagian 2 — Temuan Bernomor

### SEO-01 — Gambar Open Graph default tidak ada (404)
- **Kondisi sekarang**: Semua halaman mengirim `og:image` & `twitter:image` = `${SITE_URL}/og-default.png`, tapi file `og-default.png` tidak ada di mana pun di proyek (public/ hanya berisi favicon, 3 gambar logo, robots-info.txt).
- **Bukti**: src/lib/seo.ts:22,36,42; `find -name "og-default*"` nihil; ls public/.
- **Dampak**: Share ke WhatsApp/Facebook/Twitter/LinkedIn tampil tanpa gambar → CTR sosial turun; validator OG error. Untuk situs PMB yang banyak dibagikan orang tua/calon mahasiswa, ini pintu trafik yang bocor.
- **Tingkat**: KRITIS
- **Perbaikan disarankan**: Sediakan `public/og-default.png` 1200×630 (< 300KB), atau arahkan ke aset yang benar-benar ada.
- **Effort**: kecil

### SEO-02 — Tidak ada hreflang; canonical halaman EN menunjuk versi ID
- **Kondisi sekarang**: Situs dua bahasa (`/` vs `/en/...`, prefix as-needed), tapi tidak ada `alternates.languages`/hreflang. `buildMetadata` membangun canonical dari path tanpa prefix locale, jadi `/en/pengumuman/x` ber-canonical ke `/pengumuman/x`. Sitemap juga tidak memuat URL `/en`.
- **Bukti**: src/i18n/routing.ts:3-7; src/lib/seo.ts:21,27; grep `hreflang|languages` nihil; src/app/sitemap.ts:7-11.
- **Dampak**: Versi Inggris secara sinyal menyerah ke versi Indonesia — kemungkinan tidak terindeks terpisah; pencari berbahasa Inggris tidak terlayani. (Bisa jadi disengaja; perlu keputusan produk.)
- **Tingkat**: PENTING
- **Perbaikan disarankan**: Putuskan dulu: (a) EN memang tidak ditarget → biarkan, dokumentasikan; atau (b) EN ditarget → tambah hreflang id/en + canonical per-locale + URL en di sitemap.
- **Effort**: sedang

### SEO-03 — Tidak ada event pelacakan konversi sama sekali
- **Kondisi sekarang**: GA4 hanya dipasang `gtag('config')`. Nol event kustom: klik "Daftar Sekarang" (Hero, floating button), klik WhatsApp, unduh dokumen biaya/manual book, pemakaian kalkulator — semuanya tidak terlacak.
- **Bukti**: src/app/layout.tsx:66-78 (hanya init); grep `gtag(|dataLayer.push` di src selain init nihil.
- **Dampak**: Kampanye SEM/iklan tidak bisa diukur konversinya; tidak ada data funnel landing → daftar. Optimasi anggaran iklan jadi buta.
- **Tingkat**: PENTING (prasyarat SEM)
- **Perbaikan disarankan**: Tambah event GA4 minimal pada: klik CTA daftar (Hero + floating), klik WhatsApp, unduh dokumen, submit kalkulator.
- **Effort**: sedang

### SEO-04 — Parameter UTM tidak diteruskan ke sistem pendaftaran eksternal
- **Kondisi sekarang**: Tidak ada kode yang membaca atau mempropagasi `utm_*`. Link CTA utama hard-link ke `pendaftaran.unjani.ac.id` tanpa membawa parameter kampanye. Navigasi internal Next.js Link juga tidak membawa query.
- **Bukti**: grep `utm` di src nihil; src/components/public/Hero.tsx:60-63; src/app/[locale]/(public)/layout.tsx:45.
- **Dampak**: Atribusi kampanye putus saat user pindah domain ke sistem pendaftaran — sumber trafik pendaftar tidak bisa dilacak lintas domain.
- **Tingkat**: PENTING (untuk SEM)
- **Perbaikan disarankan**: Teruskan utm_* (atau gclid) dari URL landing ke href CTA pendaftaran; pertimbangkan cross-domain measurement GA4.
- **Effort**: sedang

### SEO-05 — Halaman /pengumuman dan /kontak tanpa H1
- **Kondisi sekarang**: Kedua halaman hanya memakai `SectionHeading` yang merender `<h2>`; tidak ada `<h1>` (grep `<h1` di halaman publik hanya menemukan Hero landing & detail pengumuman).
- **Bukti**: src/components/ui/Card.tsx:62; grep `<h1` src/app/[locale].
- **Dampak**: Sinyal topik halaman melemah; struktur heading tidak ideal untuk crawler & screen reader.
- **Tingkat**: MINOR
- **Perbaikan disarankan**: Jadikan heading utama kedua halaman `<h1>` (mis. prop `as="h1"` pada SectionHeading).
- **Effort**: kecil

### SEO-06 — Konten landing tersembunyi (opacity-0) sebelum JavaScript jalan
- **Kondisi sekarang**: Section landing dibungkus `Reveal` yang menahan `opacity-0 translate-y-5` sampai IntersectionObserver aktif. Konten ada di HTML (SSR), tapi secara visual tersembunyi tanpa JS.
- **Bukti**: src/components/public/Reveal.tsx:44-48; pemakaian di landing (src/app/[locale]/(public)/page.tsx) & FakultasProdiSection.
- **Dampak**: Googlebot merender JS sehingga umumnya aman, tapi crawler tanpa JS/preview tertentu melihat halaman kosong visual; ada risiko penilaian konten tersembunyi. First paint konten juga tertunda animasi.
- **Tingkat**: MINOR
- **Perbaikan disarankan**: Fallback `no-js` (konten tampil default, animasi hanya bila JS aktif), atau batasi Reveal ke elemen dekoratif.
- **Effort**: kecil

### SEO-07 — JSON-LD Organization & WebSite disuntik setelah hidrasi
- **Kondisi sekarang**: Dua JSON-LD global dipasang via `next/script` `strategy="afterInteractive"` → tidak ada di HTML awal, baru masuk DOM setelah JS jalan. (Kontras: JsonLd per halaman dirender inline server-side.)
- **Bukti**: src/app/layout.tsx:82-93 vs src/components/public/JsonLd.tsx:1-8.
- **Dampak**: Parser structured data yang tidak mengeksekusi JS tidak melihat Organization/WebSite; konsistensi sinyal berkurang.
- **Tingkat**: MINOR
- **Perbaikan disarankan**: Render kedua JSON-LD sebagai `<script>` inline server-side (pakai komponen JsonLd yang sudah ada).
- **Effort**: kecil

### SEO-08 — Logo pada Organization JSON-LD menunjuk file yang tidak ada
- **Kondisi sekarang**: `organizationJsonLd().logo = ${SITE_URL}/logo.svg`, tapi `logo.svg` tidak ada di public/ (yang ada: `logo-pmb-unjani (1).png`).
- **Bukti**: src/lib/seo.ts:54; ls public/.
- **Dampak**: Properti logo organisasi 404 → kandidat logo di hasil pencarian/knowledge panel tidak valid.
- **Tingkat**: MINOR
- **Perbaikan disarankan**: Arahkan ke file logo yang ada, atau sediakan `/logo.svg`.
- **Effort**: kecil

### SEO-09 — favicon.ico 270KB, dipakai juga sebagai apple-touch-icon
- **Kondisi sekarang**: Satu file `favicon.ico` 270.549 byte dipakai untuk icon, shortcut, dan apple (format .ico untuk apple-touch tidak standar).
- **Bukti**: ls public/favicon.ico; src/app/layout.tsx:41-45.
- **Dampak**: ±270KB terunduh di tiap kunjungan pertama semua halaman; apple-touch berformat ico bisa diabaikan iOS.
- **Tingkat**: MINOR
- **Perbaikan disarankan**: Favicon .ico kecil (≤15KB) + PNG 180×180 untuk apple-touch.
- **Effort**: kecil

### SEO-10 — Aset gambar sumber berat, duplikat, dan nama file bermasalah
- **Kondisi sekarang**: (a) public/uploads/hero total 8,0MB — termasuk JPG 1.040.842 byte dan file identik 549.863 byte tersimpan 3× (nama beda); (b) logo utama `logo-pmb-unjani (1).png` 465KB dengan spasi+tanda kurung di nama, dipakai di Footer semua halaman publik, login, sidebar; (c) `pmb unjani.jpg` 224KB di public/ tidak ditemukan direferensikan kode mana pun.
- **Bukti**: ls/du public/uploads/hero; ls public/; grep referensi di src (Footer.tsx:68,75; login/page.tsx:130,176; Sidebar.tsx:78; `pmb unjani.jpg` nihil).
- **Dampak**: `next/image` memitigasi ukuran kirim, tapi optimasi on-the-fly file 1MB tetap membebani server & TTFB gambar; duplikat memboroskan disk; nama file berspasi rawan masalah URL-encoding.
- **Tingkat**: PENTING (komponen LCP = hero)
- **Perbaikan disarankan**: Kompres ulang aset hero (target < 300KB, WebP), hapus duplikat, rename logo tanpa spasi/kurung, hapus aset tak terpakai.
- **Effort**: sedang

### SEO-11 — Font Awesome CSS penuh dimuat global di semua halaman
- **Kondisi sekarang**: `all.min.css` (76KB + webfonts) diimpor di root layout, sehingga ikut di halaman publik; pemakaian di komponen publik hanya 3 file (DokumenList, FakultasProdiSection, WhatsAppFloatingButton) — mayoritas pemakaian ada di admin.
- **Bukti**: src/app/layout.tsx:5; du node_modules/@fortawesome/.../all.min.css; grep `fa-` di src/components/public.
- **Dampak**: CSS render-blocking membesar untuk halaman publik yang hanya memakai segelintir ikon.
- **Tingkat**: MINOR
- **Perbaikan disarankan**: Muat FA hanya di layout admin, ganti ikon publik dengan SVG inline.
- **Effort**: sedang

### SEO-12 — Alt text popup bergantung field DB yang boleh kosong
- **Kondisi sekarang**: LandingPopup merender `<img>` (bukan next/image) dengan alt dari `Popup.alt` yang default `''`; admin tidak diwajibkan mengisi.
- **Bukti**: src/components/public/LandingPopup.tsx:117-125; src/models/Popup.ts:6.
- **Dampak**: Gambar promosi bisa tanpa alt bermakna → aksesibilitas & konteks gambar untuk crawler berkurang.
- **Tingkat**: MINOR
- **Perbaikan disarankan**: Wajibkan alt di form admin popup, fallback ke judul popup.
- **Effort**: kecil

### SEO-13 — Nilai runtime kritis tidak dapat diverifikasi dari kode (UNKNOWN)
- **Kondisi sekarang**: Empat hal bergantung konfigurasi runtime yang tidak terlihat di repo: (a) `NEXT_PUBLIC_SITE_URL` production — jika kosong, canonical/sitemap/OG jatuh ke fallback `http://localhost:3000`; (b) ID GA4 terisi atau tidak (Settings di DB); (c) redirect www/non-www & http→https di Nginx; (d) header cache CDN/proxy untuk aset statis.
- **Bukti**: src/lib/seo.ts:3-6; src/app/layout.tsx:60-61; .htaccess:1 (placeholder); .env production tidak diperiksa (di luar scope baca).
- **Dampak**: Jika (a) salah, seluruh sinyal URL rusak; (b)-(d) menentukan efektivitas analytics & caching.
- **Tingkat**: PENTING (sebagai item verifikasi manual)
- **Perbaikan disarankan**: Verifikasi manual keempat nilai di server production; cek `view-source` canonical & response header di URL live.
- **Effort**: kecil (verifikasi)

## Bagian 3 — Tabel Prioritas (dampak tinggi + effort kecil di atas)

| Prioritas | Temuan | Tingkat | Effort | Alasan urutan |
|---|---|---|---|---|
| 1 | SEO-01 og:image 404 | KRITIS | kecil | Satu file memperbaiki tampilan share semua halaman |
| 2 | SEO-13 verifikasi SITE_URL, GA, redirect server | PENTING | kecil | Cek manual cepat; menentukan validitas banyak temuan lain |
| 3 | SEO-05 H1 /pengumuman & /kontak | MINOR | kecil | Perubahan satu prop komponen |
| 4 | SEO-07 JSON-LD global inline server | MINOR | kecil | Pindah 2 blok script |
| 5 | SEO-08 logo.svg 404 di JSON-LD | MINOR | kecil | Ganti satu path |
| 6 | SEO-09 favicon 270KB | MINOR | kecil | Ganti aset |
| 7 | SEO-06 fallback no-js untuk Reveal | MINOR | kecil | Guard CSS sederhana |
| 8 | SEO-12 alt popup wajib | MINOR | kecil | Validasi form admin |
| 9 | SEO-03 event konversi GA4 | PENTING | sedang | Dampak SEM besar, butuh penentuan event & testing |
| 10 | SEO-04 propagasi UTM lintas domain | PENTING | sedang | Bergantung keputusan tracking bersama sistem pendaftaran |
| 11 | SEO-10 optimasi aset hero & logo | PENTING | sedang | Perbaikan LCP; butuh reproses aset |
| 12 | SEO-02 strategi hreflang/EN | PENTING | sedang | Butuh keputusan produk dulu |
| 13 | SEO-11 Font Awesome global | MINOR | sedang | Refactor ikon publik ke SVG |

Tidak ada perubahan kode yang dilakukan dalam audit ini.
