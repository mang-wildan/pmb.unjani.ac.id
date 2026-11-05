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
| Baseline lint lokal | lihat T.1.1 di bawah |

## Fase 1

Status 5 November 2026. Kode T.1.2 sampai T.1.9 sudah ditulis. Hanya cek yang bisa jalan tanpa server yang sudah dijalankan.

| Task | Status | Bukti |
|---|---|---|
| T.1.2 robots.txt | kode selesai, cek `curl` tertunda | - |
| T.1.3 `buildMetadata` | **lulus** | assert `LULUS` (Node 25, type stripping), `tsc --noEmit` bersih |
| T.1.4 bahasa dan noindex | kode selesai, cek `curl` tertunda | - |
| T.1.5 title dan meta beranda | kode selesai, cek `curl` tertunda | - |
| T.1.6 structured data | kode selesai, cek `curl` tertunda | `grep -rn 'logo.svg' src` kosong |
| T.1.7 markup jalur dan FAQ | kode selesai, cek `curl` dan manual tertunda | - |
| T.1.8 WhatsApp dan ejaan | kode selesai, cek `curl` tertunda | `grep -rn Universtas src` kosong |
| T.1.9 `toSlug` | **lulus** | assert `LULUS` |
| T.1.10 `fetchpriority` | belum dicek | `HeroSlider.tsx:122` sudah `priority={indeks === 0}` |
| T.1.11 checkpoint | belum | - |

Lint pada folder yang diubah (`src/app`, `src/lib`, `src/i18n`, `src/components/public`): 0 error, 8 warning, semuanya di file yang tidak diubah.

Penghalang cek `curl`: `next dev` gagal dengan `No prebuild or local build of @parcel/watcher found. Tried @parcel/watcher-win32-x64`. `node_modules` tampaknya terpasang untuk platform lain, padahal ada folder `node_modules-windows-backup`. MongoDB lokal (27017) juga tidak aktif.

Catatan lint baseline (T.1.1): `yarn lint` (`eslint .`) ikut memindai `node_modules-windows-backup/`, sehingga sangat lambat dan angkanya tidak bermakna. Baseline perlu diukur ulang setelah folder itu dipindah atau di-ignore.
