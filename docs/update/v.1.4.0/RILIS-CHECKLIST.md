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
