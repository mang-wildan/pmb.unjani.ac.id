# SPEC v1.4.0 — Perbaikan SEO (tindak lanjut AUDIT-SEO 5 November 2026)

- **Status:** draf, menunggu persetujuan pemilik produk (gerbang T.1.0 di TODO.md).
- **Tanggal:** 5 November 2026.
- **Sumber:** `AUDIT-SEO.md` (folder ini) dan pembacaan kode pada tanggal yang sama.
- **Rencana kerja:** `TODO.md` (folder ini).

---

## 1. Tujuan

1. Setiap niat pencarian utama punya URL sendiri: biaya kuliah, jalur masuk, jadwal, dan FAQ.
2. Menutup kebocoran teknis: host HTTP/www, URL lama, PDF biaya yang diblokir robots.txt, structured data yang rusak, dan hreflang.
3. Memperbaiki title, meta, dan markup yang dibaca crawler dan mesin AI.

**Ukuran keberhasilan:**
- Semua kriteria terima di §5 lulus di production dan tercatat di `RILIS-CHECKLIST.md`.
- Dalam 30 hari setelah rilis, keempat URL topik baru berstatus *Indexed* di laporan Pages Search Console.

## 2. Batasan

- Tidak menambah atau meng-upgrade dependency (AGENTS.md).
- Tidak menyentuh `.env`, config auth, maupun migration yang sudah dijalankan (AGENTS.md).
- Tidak mengubah skema database. Semua kebutuhan dipenuhi dari field yang sudah ada.
- Bahasa dokumen dan komentar: Indonesia. Kunci i18n `messages/id.json` dan `messages/en.json` selalu ditambah bersamaan.
- Ikuti pola yang sudah ada:
  - `await connectDb()`
  - `buildMetadata()`
  - komponen `JsonLd`
  - `SectionHeading level={1}` untuk H1
  - `export const revalidate = 60` untuk halaman publik baru
- Proyek tidak punya framework test. Verifikasi memakai:
  - `npx tsc --noEmit`, `yarn lint`, `yarn build`
  - assert `node:assert` lewat `npx tsx -e` untuk fungsi murni
  - `curl` ke dev server (`yarn dev`, port 9532) atau ke production.

## 3. Keputusan

| ID | Keputusan | Asal |
|---|---|---|
| D-01 | Folder route redirect `src/app/[locale]/(public)/jalur-seleksi`, `biaya-pendidikan`, dan `jadwal` **dihapus** dan tidak dihidupkan lagi. Redirect URL lamanya dipindah ke `redirects()` di `next.config.mjs`, menuju halaman baru. | Pemilik, 5 Nov 2026 |
| D-02 | Slug halaman baru: `/biaya-kuliah`, `/jalur-masuk`, `/jadwal-pmb`, `/faq`. Jadwal memakai `/jadwal-pmb` karena `/jadwal` tidak boleh dihidupkan lagi (D-01). | Pemilik, 5 Nov 2026 |
| D-03 | Beranda tetap utuh pada rilis ini (semua section dan kalkulator tetap ada). Yang berubah hanya title/meta, markup heading, dan tautan ke halaman topik. Pemangkasan beranda ditunda sampai ada data Search Console. | Pemilik, 5 Nov 2026 |
| D-04 | Biaya tetap mengikuti FR-53: biaya dari jadwal yang sudah berakhir tidak tampil, termasuk di `/biaya-kuliah`. Saat datanya kosong, halaman tetap tampil dengan dokumen PDF biaya dan kontak. Usulan audit untuk menampilkan biaya 2026 sebagai "acuan" **tidak diambil**, karena berisiko menampilkan harga basi. Pengisian biaya 2027/2028 menjadi tugas konten (T.3.4). | Pemilik, 5 Nov 2026 |
| D-05 | Animasi hitung angka statistik di hero (`CountUp` di `Hero.tsx`) dihapus, angka ditampilkan statis. `CountUp.tsx` tetap ada karena masih dipakai `KalkulatorForm.tsx`. | Pemilik, 5 Nov 2026 |
| D-06 | URL lama tanpa padanan tetap mengembalikan 404 (perilaku ini sudah benar). Tidak memasang 410. | Pemilik, 5 Nov 2026 |
| D-07 | Konten `/en` yang belum diterjemahkan (`judul_en` kosong) diberi `noindex`, dikeluarkan dari sitemap, dan tidak dirujuk hreflang. | Pemilik, 5 Nov 2026 |
| D-08 | Pengunjung tidak dialihkan otomatis ke `/en` berdasarkan bahasa browser (`localeDetection: false`). Pilihan bahasa tetap tersedia lewat `LanguageSwitcher`. | Pemilik, 5 Nov 2026 |
| D-09 | Slug artikel yang sudah terbit tidak diganti. Form artikel tidak punya field slug, sehingga mengganti slug berarti mengubah DB sekaligus menambah redirect. Perbaikan `toSlug` hanya berlaku untuk slug baru. | Pemilik, 5 Nov 2026 |
| D-10 | Logo di schema memakai file yang sudah ada dengan URL ter-encode: `/logo-pmb-unjani%20(1).png`. Rename file ditunda. | Pemilik, 5 Nov 2026 |
| D-11 | Stub `/kalkulator` dan `/manual-book` (redirect ke `/`) tidak disentuh, karena di luar permintaan. | Pemilik, 5 Nov 2026 |

## 4. Ruang Lingkup

### Masuk rilis

| FR | Temuan audit |
|---|---|
| FR-SEO-01 Host kanonis | K1 |
| FR-SEO-02 Redirect URL lama | K3, D-01 |
| FR-SEO-03 robots.txt | K4 (bagian robots), M12 |
| FR-SEO-04 Metadata dan bahasa | P1, P4, M5 |
| FR-SEO-05 Structured data | P7 (schema), P8 |
| FR-SEO-06 Markup ramah crawler | P2, P3, P9 |
| FR-SEO-07 Link WhatsApp dan ejaan | P5 (wa.me), M11 |
| FR-SEO-08 Slug baru | M2 |
| FR-SEO-09 Halaman topik | K2, K4 |
| FR-SEO-10 Internal link dan sitemap | K2, §3 audit |
| FR-SEO-11 Konten CMS | P5 (link konten), P6, P7 (isi), P10, M3, M4, M6, M7, M8, M10 (telepon), M15, K4 (data biaya) |

### Ditunda

Setiap item di bawah dikerjakan bila syarat di kolom kanan terpenuhi.

| Item | Alasan | Kerjakan bila |
|---|---|---|
| 14 sub-halaman `/jalur-masuk/{jalur}` | Anchor `#slug` sudah ada per jalur (`JalurAccordion.tsx:76`) | Search Console menunjukkan `/jalur-masuk` mendapat impresi untuk query jalur tertentu |
| `/program-studi` dan halaman per prodi | `ProgramStudi` tidak punya field slug (perlu perubahan skema DB) | Ada rilis yang mengizinkan perubahan skema |
| `/kuliah-di-cimahi`, `/beasiswa` | Belum ada kontennya | Tim konten menyiapkan naskah |
| Event schema | Tanggal ujian CBT belum ada di situs | Jadwal ujian resmi terbit |
| `llms.txt` | Manfaat belum terbukti, isinya duplikat halaman topik | Halaman topik sudah stabil |
| Ganti slug artikel lama (`/artikel/tes`, slug terpotong) | D-09 | Ada fitur edit slug + redirect |
| 410 Gone untuk feed WordPress | D-06 | Tidak direncanakan |
| Rename logo, favicon 270 KB, Font Awesome global | Sisa v1.3.0 (SEO-09/10/11), bukan temuan audit ini | Rilis performa |
| Pemangkasan section beranda | D-03 | Data Search Console 30 hari |
| Anchor generik (M9), jam layanan kontak (M10) | Butuh perubahan UI atau field baru | Rilis berikutnya |
| Memindah PDF keluar dari `/api` | Cukup diizinkan di robots.txt (FR-SEO-03) | Tidak perlu |

### Di luar repo

- Konfigurasi nginx/aaPanel (FR-SEO-01).
- Isi konten di CMS admin (FR-SEO-11).
- Search Console (T.4.2).

## 5. Kebutuhan dan Kriteria Terima

Dalam kriteria terima, `B` berarti `http://localhost:9532` (dev) dan `P` berarti `https://pmb.unjani.ac.id` (production).

### FR-SEO-01 Host kanonis (K1, di server)

Semua kombinasi `http://` dan `www.` dialihkan dengan 301 dalam **satu hop** ke `https://pmb.unjani.ac.id` dengan path yang sama. Rule lama yang mengarahkan www ke `http://` harus dihapus.

Kriteria terima:
- `curl -sI http://pmb.unjani.ac.id/kontak`, `curl -sI http://www.pmb.unjani.ac.id/kontak`, dan `curl -sI https://www.pmb.unjani.ac.id/kontak` masing-masing mengembalikan `301` dengan `location: https://pmb.unjani.ac.id/kontak`.
- `curl -sI P/` mengembalikan `200` dan header `strict-transport-security`. Header ini sudah dikirim oleh `next.config.mjs:28` dan tidak perlu diubah.

### FR-SEO-02 Redirect URL lama (K3, D-01)

Tiga folder di D-01 dihapus. `next.config.mjs` mendapat `async redirects()` dengan isi tabel §6.3. Semua rule memakai `permanent: true` (308; Google memperlakukannya sama dengan 301).

Kriteria terima:
- Setiap `source` di §6.3 mengembalikan `308` ke `destination`-nya.
- `curl -sL -o /dev/null -w "%{http_code} %{num_redirects}" B/jadwal/` menghasilkan `200` dengan jumlah redirect ≤ 2.
- `/en/jadwal` berakhir di `/en/jadwal-pmb`.
- URL yang tidak ada di tabel tetap 404.

### FR-SEO-03 robots.txt (K4, M12)

`src/app/robots.ts` menghasilkan `allow: ['/', '/api/files/']` dan `disallow: ['/admin', '/api']`, tanpa `host`.

Kriteria terima:
- `curl -s B/robots.txt` memuat `Allow: /api/files/`.
- Tidak ada baris `Host:`.
- Masih memuat `Disallow: /api`.

### FR-SEO-04 Metadata dan bahasa (P1, P4, M5)

1. `buildMetadata` menambah `alternates.languages['x-default']` yang menunjuk URL versi `id`.
2. `openGraph.locale` bernilai `en_US` untuk locale `en`, dan `id_ID` untuk `id`.
3. Opsi baru `hanyaId: true` berarti `languages` hanya berisi `id` dan `x-default`. Bila locale-nya `en`, robots menjadi `{ index: false, follow: false }`.
4. Detail `/pengumuman/[slug]` dan `/artikel/[slug]` memanggil `buildMetadata({ ..., hanyaId: !doc.judul_en?.trim() })`.
5. Sitemap hanya memuat varian `/en` untuk pengumuman atau artikel yang punya `judul_en`.
6. `src/i18n/routing.ts` mendapat `localeDetection: false`.
7. Title beranda: `PMB UNJANI {tahun} – {home.metaTitleSufiks}`, dengan `{tahun}` diambil dari `PageContent` kunci `hero`, field `data.tahunAjaran`. Bila `tahunAjaran` kosong, title menjadi `PMB UNJANI – {home.metaTitleSufiks}` (tanpa spasi ganda).
8. Teks meta mengikuti §6.4 persis.

Kriteria terima:
- `curl -s B/ | grep -o '<title>[^<]*'` menghasilkan `PMB UNJANI 2027/2028 – Pendaftaran Kuliah di Cimahi &amp; Bandung` (bila hero berisi `2027/2028`).
- `curl -s B/en | grep -o '<title>[^<]*'` memakai sufiks bahasa Inggris.
- HTML `B/kontak` memuat `hreflang="x-default"` yang menunjuk `.../kontak`.
- `curl -s -o /dev/null -w "%{http_code}" -H "Accept-Language: en" B/` mengembalikan `200` (bukan 307).
- Untuk pengumuman tanpa `judul_en`: `B/en/pengumuman/<slug>` memuat `noindex`, dan URL `/en/...` itu tidak ada di `sitemap.xml`.
- Untuk pengumuman yang punya `judul_en`, URL `/en/...` tetap `index` dan tetap ada di sitemap.

### FR-SEO-05 Structured data (P7, P8)

1. Tambah konstanta `LOGO_URL` di `seo.ts`, lalu pakai di `organizationJsonLd`, di publisher Article (`artikel/[slug]`), dan di publisher NewsArticle (`pengumuman/[slug]`). Tidak boleh ada lagi rujukan ke `logo.svg`.
2. `organizationJsonLd(settings)` mengikuti bentuk §6.5.
3. JSON-LD Organization dan WebSite di `src/app/layout.tsx` dirender inline di server lewat `<JsonLd>`, menggantikan `next/script` `afterInteractive`.
4. `/kontak` tidak lagi merender `organizationJsonLd()` (duplikat dari layout).
5. Article: `author` menjadi `{ '@type': 'Organization', name: createdBy?.nama || SITE_NAME }`.
6. NewsArticle mendapat `author` `{ '@type': 'Organization', name: SITE_NAME }`.
7. `dateModified` di Article dan NewsArticle = nilai terbesar antara `publishedAt` dan `updatedAt`.

Kriteria terima:
- `curl -s B/ | grep -c 'logo.svg'` menghasilkan `0`.
- HTML awal `B/` (tanpa JS) memuat `"@type":"CollegeOrUniversity"` tepat 1 kali.
- `B/kontak` juga memuatnya tepat 1 kali.
- Di setiap artikel, `dateModified ≥ datePublished`.
- Rich Results Test pada 1 artikel dan 1 pengumuman tidak menunjukkan error.

### FR-SEO-06 Markup ramah crawler (P2, P3, P9)

1. `JalurAccordion`:
   - Setiap nama jalur menjadi heading (default `h3`) yang membungkus `<button>`.
   - Judul persyaratan menjadi heading satu tingkat di bawahnya, dengan teks dari kunci i18n `jalurPage.persyaratan` = `Persyaratan {nama}`.
   - `ringkasan` dirender **satu kali**: di tombol, `line-clamp-1` hanya saat tertutup. Salinan di panel dihapus.
   - `<p>` di dalam tombol diganti `<span className="block ...">`.
   - Prop `tingkatJudul?: 'h2' | 'h3'` (default `'h3'`) diteruskan dari `JalurList`.
2. `FAQAccordion`:
   - Setiap pertanyaan menjadi `<h3>` yang membungkus `<button>`.
   - Prop `tampilkanTab?: boolean` (default `true`). Bila `false`: tanpa bar tab, semua `items` dirender tanpa filter kategori.
3. `Hero.tsx`: `<CountUp nilai={...} />` diganti angka polos (D-05).
4. Gambar hero pertama: bila HTML production belum memuat `fetchpriority="high"`, tambahkan `fetchPriority="high"` pada `Image` indeks 0 di `HeroSlider.tsx`.

Kriteria terima:
- Di HTML `B/`, jumlah `<h3` yang berisi tepat `Persyaratan</h3>` = `0`.
- Nama setiap jalur aktif muncul di dalam elemen `<h3`.
- `ringkasan` setiap jalur muncul 1 kali.
- Statistik hero berbunyi `11` dan `48` (sesuai data), tanpa angka tengah animasi.
- `<img` hero pertama memuat `fetchpriority="high"`.

### FR-SEO-07 Link WhatsApp dan ejaan (P5, M11)

1. `kontak/page.tsx:94` menormalisasi nomor dengan ekspresi yang sama seperti `page.tsx:290`: `.replace(/\D/g, '').replace(/^0/, '62')`.
2. Kata `Universtas` di `page.tsx:583` dan `WhatsAppFloatingButton.tsx:5` diperbaiki menjadi `Universitas`.

Kriteria terima:
- `curl -s B/kontak | grep -o 'wa.me/[0-9]*'` menghasilkan `wa.me/62…`, tidak pernah `wa.me/0…`.
- `grep -rn Universtas src` tidak menemukan apa pun.

### FR-SEO-08 Slug baru (M2)

`toSlug(input)` di `src/lib/slug.ts` diubah:
1. Ganti `&` dan `/` dengan spasi sebelum memanggil `slugify`.
2. Panjang maksimal 80. Bila harus dipotong, potong di `-` terakhir dalam 80 karakter pertama. Bila tidak ada `-` sama sekali, potong tepat di karakter ke-80.
3. Tidak boleh ada `-` di akhir.
4. Idempoten: `toSlug(toSlug(x)) === toSlug(x)`, dan slug valid ≤ 80 karakter tidak berubah.

Kriteria terima: lihat assert di TODO T.1.9.

### FR-SEO-09 Halaman topik (K2, K4)

Empat halaman baru di `src/app/[locale]/(public)/`. Masing-masing punya:
- `generateMetadata` → `buildMetadata` (teks §6.4)
- satu H1 (`SectionHeading level={1}`)
- JSON-LD BreadcrumbList (Beranda › halaman), dengan prefix `/en` untuk locale `en`
- `revalidate = 60`
- query yang gagal tidak menyebabkan 500: ikuti pola `connectDb().catch(() => null)` dan `.catch(() => [])`.

| Rute | Isi |
|---|---|
| `/biaya-kuliah` | `KalkulatorForm` dan `TabelBiaya` dari `muatDataBiaya()`, plus `DokumenList` kategori `biaya`. Bila `records` kosong: tabel tidak dirender, kalkulator menampilkan keadaan kosong yang sudah ada, dan dokumen tetap tampil (D-04). |
| `/jalur-masuk` | `JalurList` dengan `tingkatJudul="h2"` untuk semua `JalurSeleksi` aktif. |
| `/jadwal-pmb` | `JadwalTable` untuk `Jadwal` dengan `status: true` dan `selesai ≥ awal hari ini`, populate `jalur` (`nama`), urut `mulai` naik. Kolom status memakai `statusJadwal()`: `berjalan` → `jadwalPage.sedangBerlangsung`, `akan-datang` → `jadwalPage.mulaiDalam` dengan `{ days: hariMenujuMulai(mulai) }`; bila null → `—`. |
| `/faq` | Per kategori FAQ aktif (`Teknis`, `Biaya`, `Jadwal`): `<h2>` berlabel `faq.teknis`/`faq.biaya`/`faq.jadwal`, lalu `FAQAccordion tampilkanTab={false}`. JSON-LD `faqPageJsonLd(items)`, tidak dirender bila tidak ada FAQ. Teks JSON-LD identik dengan teks yang tampil. |

Kriteria terima:
- Setiap rute `id` dan `en` mengembalikan `200`, dengan tepat 1 `<h1`, canonical self, dan title sesuai §6.4.
- `/biaya-kuliah` dengan ≥ 1 biaya aktif memuat `<table`. Dengan nol biaya aktif: `200`, tanpa `<table`, dan dokumen biaya tetap tampil.
- `/faq` memuat `"@type":"FAQPage"` dan semua pertanyaan aktif ada di HTML awal.
- Dengan nol FAQ: `200` tanpa `FAQPage`.
- Kalkulator dan data biaya di beranda tetap identik dengan sebelum ekstraksi `muatDataBiaya`.

### FR-SEO-10 Internal link dan sitemap

1. `Navbar`: `/#jalur` → `/jalur-masuk`, `/#kalkulator` → `/biaya-kuliah`. `/#manual-book`, `/pengumuman`, dan `/kontak` tetap.
2. `Footer`, kolom Informasi: `kalkulatorPmb` → `/biaya-kuliah`. Tambah link `footer.jalurSeleksi` → `/jalur-masuk`, `footer.jadwal` → `/jadwal-pmb`, dan `footer.faq` (kunci baru) → `/faq`.
3. Beranda menambah tautan di bawah section:
   - jalur: `home.jalurLink` → `/jalur-masuk`
   - jadwal: `home.jadwalLink` → `/jadwal-pmb`
   - kalkulator: `home.biayaLink` (baru) → `/biaya-kuliah`
   - FAQ: `home.faqLink` (baru) → `/faq`
   Tombol hero "Hitung Biaya" tetap `/#kalkulator` (D-03).
4. Sitemap menambah empat rute statis (`id` dan `en`): `/biaya-kuliah` (weekly, 0.9), `/jalur-masuk` (weekly, 0.9), `/jadwal-pmb` (weekly, 0.8), `/faq` (monthly, 0.7).

Kriteria terima:
- `curl -s B/sitemap.xml | grep -c -E '/(biaya-kuliah|jalur-masuk|jadwal-pmb|faq)</loc>'` menghasilkan `8`.
- HTML `B/kontak` tidak memuat `href="/#jalur"` maupun `href="/#kalkulator"`.

### FR-SEO-11 Konten CMS (dikerjakan admin, tanpa deploy)

Daftar tugasnya ada di TODO T.3.1–T.3.4. Kriteria terima per tugas tercantum di sana.

## 6. Desain Teknis

### 6.1 Peta file

| Aksi | File | Tanggung jawab |
|---|---|---|
| Hapus | `src/app/[locale]/(public)/jalur-seleksi/`, `biaya-pendidikan/`, `jadwal/` | D-01 |
| Buat | `src/app/[locale]/(public)/biaya-kuliah/page.tsx` | Halaman biaya |
| Buat | `src/app/[locale]/(public)/jalur-masuk/page.tsx` | Halaman jalur |
| Buat | `src/app/[locale]/(public)/jadwal-pmb/page.tsx` | Halaman jadwal |
| Buat | `src/app/[locale]/(public)/faq/page.tsx` | Halaman FAQ |
| Buat | `src/lib/dataBiaya.ts` | Query dan transformasi biaya, dipindah dari `page.tsx:173-196,211-277` |
| Buat | `src/components/public/TabelBiaya.tsx` | Tabel HTML biaya (server component) |
| Buat | `docs/update/v.1.4.0/RILIS-CHECKLIST.md` | Bukti verifikasi |
| Ubah | `next.config.mjs` | `redirects()` |
| Ubah | `src/app/robots.ts` | FR-SEO-03 |
| Ubah | `src/i18n/routing.ts` | `localeDetection: false` |
| Ubah | `src/lib/seo.ts` | `buildMetadata`, `LOGO_URL`, `organizationJsonLd`, `faqPageJsonLd` |
| Ubah | `src/lib/slug.ts` | FR-SEO-08 |
| Ubah | `src/app/layout.tsx` | JSON-LD inline |
| Ubah | `src/app/sitemap.ts` | Rute baru, filter `/en` |
| Ubah | `src/app/[locale]/(public)/page.tsx` | Meta beranda, `muatDataBiaya`, link section, ejaan |
| Ubah | `src/app/[locale]/(public)/kontak/page.tsx` | WA, hapus Organization duplikat |
| Ubah | `src/app/[locale]/(public)/artikel/[slug]/page.tsx`, `pengumuman/[slug]/page.tsx` | `hanyaId`, schema |
| Ubah | `src/components/public/JalurAccordion.tsx`, `JalurList.tsx`, `FAQAccordion.tsx`, `Hero.tsx`, `HeroSlider.tsx` (bersyarat), `JadwalTable.tsx`, `Navbar.tsx`, `Footer.tsx`, `WhatsAppFloatingButton.tsx` | FR-SEO-06/07/10 |
| Ubah | `messages/id.json`, `messages/en.json` | Teks §6.4 dan kunci baru |
| Ubah | `docs/ARCHITECTURE.md` §3, `docs/UI-CURRENT.md` | Daftar route publik |

### 6.2 Antarmuka

```ts
// src/lib/seo.ts
export const LOGO_URL: string; // `${SITE_URL}/logo-pmb-unjani%20(1).png`
export function buildMetadata(opts: {
  title?: string; description?: string; path: string; locale: PublicLocale;
  image?: string; noIndex?: boolean;
  hanyaId?: boolean; // baru: tanpa varian en; noindex bila locale 'en'
}): Metadata;
export function organizationJsonLd(settings?: PublicSettings | null): Record<string, unknown>;
export function faqPageJsonLd(items: { pertanyaan: string; jawaban: string }[]): Record<string, unknown> | null; // null bila kosong

// src/lib/slug.ts
export function toSlug(input: string): string;

// src/lib/dataBiaya.ts
export type DataBiaya = {
  records: BiayaRecord[]; prodiOptions: SearchableSelectOption[];
  prodiMap: Record<string, ProdiInfo>; kelasMap: Record<string, KelasOpt>; jadwalMap: Record<string, JadwalOpt>;
};
export async function muatDataBiaya(acuan?: Date): Promise<DataBiaya>; // gagal → semua kosong, error di-log
export async function muatKalkulatorKosong(locale: string): Promise<KalkulatorKosong>; // dipindah dari page.tsx:287-297

// src/components/public/TabelBiaya.tsx (server component)
export default async function TabelBiaya({ data }: { data: DataBiaya }): Promise<JSX.Element | null>; // null bila records kosong

// src/app/sitemap.ts
function localizedEntries(path: string, data: ..., adaEn?: boolean /* default true */): MetadataRoute.Sitemap;
```

Detail `TabelBiaya`:
- Kolom: `biayaPage.kolomProdi` (singkatan jenjang + nama prodi), `kolomJalur` (`jalur_nama`), `kolomKelas` (`—` bila null), `kolomGelombang` (`jadwalMap[...].judul`), `kolomPokok` (`biaya`), `kolomSemester` (`biayaPerSemester`, `—` bila null).
- Format uang: `new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })`.
- Urutan: nama prodi, jalur, kelas, `ke`.
- `<caption>` dari `biayaPage.tabelJudul`.

### 6.3 Tabel redirect (`next.config.mjs`, semua `permanent: true`)

| source | destination |
|---|---|
| `/jalur-seleksi` | `/jalur-masuk` |
| `/en/jalur-seleksi` | `/en/jalur-masuk` |
| `/biaya-pendidikan` | `/biaya-kuliah` |
| `/en/biaya-pendidikan` | `/en/biaya-kuliah` |
| `/jadwal` | `/jadwal-pmb` |
| `/en/jadwal` | `/en/jadwal-pmb` |
| `/prodi` | `/` |
| `/infomasi-biaya` | `/biaya-kuliah` |
| `/semuajalur` | `/jalur-masuk` |
| `/jalur-lanjutan` | `/jalur-masuk` |
| `/jalur-pmdk-3` | `/jalur-masuk` |
| `/jalur-magister` | `/jalur-masuk` |
| `/jalur-ods` | `/pengumuman/mekanisme-ods` |
| `/jadwal-pmb-september` | `/jadwal-pmb` |

Catatan:
- URL WordPress lama `/faq` tidak perlu rule, karena kini dilayani halaman baru `/faq`.
- `redirects()` dievaluasi sebelum `src/proxy.ts`, sehingga next-intl tidak ikut campur.

### 6.4 Teks meta (persis)

Title halaman topik mendapat sufiks ` — PMB UNJANI` otomatis dari `buildMetadata`.

| Kunci | id | en |
|---|---|---|
| `home.metaTitleSufiks` | Pendaftaran Kuliah di Cimahi & Bandung | Study in Cimahi & Bandung, Indonesia |
| `home.metaDesc` | Pendaftaran mahasiswa baru Universitas Jenderal Achmad Yani (UNJANI) Cimahi dan Bandung telah dibuka. Cek jalur masuk, biaya kuliah, jadwal, dan daftar online. | New student admissions at Universitas Jenderal Achmad Yani (UNJANI), Cimahi and Bandung, are open. Check admission paths, tuition fees, schedules, and apply online. |
| `biayaPage.metaTitle` | Biaya Kuliah UNJANI per Program Studi | UNJANI Tuition Fees by Study Program |
| `biayaPage.metaDesc` | Biaya kuliah UNJANI per program studi, jalur masuk, dan kelas: biaya pokok dan estimasi per semester, dilengkapi kalkulator dan dokumen resmi. | UNJANI tuition fees by study program, admission path, and class: base fee and estimated cost per semester, with a fee calculator and official documents. |
| `jalurPage.metaTitle` | Jalur Masuk UNJANI dan Persyaratannya | UNJANI Admission Paths and Requirements |
| `jalurPage.metaDesc` | Daftar lengkap jalur masuk Universitas Jenderal Achmad Yani (UNJANI) beserta ringkasan dan persyaratan setiap jalur seleksi mahasiswa baru. | Complete list of admission paths at Universitas Jenderal Achmad Yani (UNJANI), with a summary and the requirements of each selection path. |
| `jadwalPage.metaTitle` | Jadwal PMB dan Gelombang Pendaftaran | Admission Schedule and Registration Waves |
| `jadwalPage.metaDesc` | Jadwal resmi PMB Universitas Jenderal Achmad Yani (UNJANI): periode dan gelombang pendaftaran yang sedang dan akan dibuka, lengkap dengan tanggal. | Official admission schedule of Universitas Jenderal Achmad Yani (UNJANI): current and upcoming registration periods and waves, with their dates. |
| `faqPage.metaTitle` | Pertanyaan Seputar Pendaftaran (FAQ) | Admissions FAQ |
| `faqPage.metaDesc` | Jawaban atas pertanyaan yang sering diajukan tentang pendaftaran mahasiswa baru UNJANI: cara daftar, ujian CBT, One Day Services, biaya, dan jadwal. | Answers to frequently asked questions about UNJANI new student admissions: how to apply, the CBT exam, One Day Services, fees, and schedules. |
| `pengumumanPage.metaDesc` | Pengumuman resmi panitia PMB Universitas Jenderal Achmad Yani (UNJANI): pembukaan gelombang, jadwal ujian, kelulusan, dan registrasi ulang. | Official announcements from the UNJANI admissions committee: new registration waves, exam schedules, results, and re-registration. |
| `kontakPage.metaDesc` | Hubungi panitia PMB UNJANI di Kantor Admisi, Gedung Rektorat Lantai 1, Cimahi, lewat WhatsApp, email, atau media sosial resmi. | Contact the UNJANI admissions committee at the Admissions Office, Rectorate Building 1st Floor, Cimahi, via WhatsApp, email, or official social media. |
| `artikelPage.metaDesc` | Artikel, panduan, dan berita terbaru seputar penerimaan mahasiswa baru Universitas Jenderal Achmad Yani (UNJANI) di Cimahi dan Bandung. | Articles, guides, and the latest news about new student admissions at Universitas Jenderal Achmad Yani (UNJANI) in Cimahi and Bandung. |

Kunci baru lain:

| Kunci | id | en |
|---|---|---|
| `faqPage.eyebrow` | Tanya Jawab | Q&A |
| `faqPage.title` | Pertanyaan Seputar PMB UNJANI | UNJANI Admissions FAQ |
| `faqPage.desc` | Jawaban singkat untuk pertanyaan yang paling sering diajukan calon mahasiswa dan orang tua. | Short answers to the questions prospective students and parents ask most often. |
| `jalurPage.persyaratan` | Persyaratan {nama} | {nama} requirements |
| `biayaPage.tabelJudul` | Tabel biaya kuliah per program studi | Tuition fees by study program |
| `biayaPage.kolomProdi` / `kolomJalur` / `kolomKelas` / `kolomGelombang` / `kolomPokok` / `kolomSemester` | Program Studi / Jalur / Kelas / Gelombang / Biaya Pokok / Estimasi per Semester | Study Program / Path / Class / Wave / Base Fee / Estimated per Semester |
| `home.biayaLink` | Lihat tabel biaya kuliah lengkap → | See the full tuition fee table → |
| `home.faqLink` | Lihat semua pertanyaan → | See all questions → |
| `footer.faq` | FAQ | FAQ |

Kunci `eyebrow`/`title`/`desc` pada `biayaPage`, `jalurPage`, dan `jadwalPage` yang sudah ada dipakai apa adanya, kecuali `biayaPage.desc`:
- id: `Biaya pokok dan estimasi biaya per semester untuk setiap program studi, jalur masuk, kelas, dan gelombang yang sedang dibuka.`
- en: `Base fee and estimated cost per semester for every study program, admission path, class, and wave currently open.`

### 6.5 Bentuk `organizationJsonLd(settings)`

```json
{
  "@context": "https://schema.org",
  "@type": "CollegeOrUniversity",
  "@id": "<SITE_URL>/#organization",
  "name": "Universitas Jenderal Achmad Yani",
  "alternateName": ["UNJANI", "PMB UNJANI"],
  "url": "https://www.unjani.ac.id/",
  "logo": "<LOGO_URL>",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "<settings.alamat || 'Jl. Terusan Jenderal Sudirman'>",
    "addressLocality": "Cimahi", "addressRegion": "Jawa Barat", "addressCountry": "ID"
  },
  "contactPoint": [{
    "@type": "ContactPoint", "contactType": "admissions",
    "email": "<settings.email, dihilangkan bila kosong>",
    "telephone": "<settings.telepon, dihilangkan bila kosong>",
    "availableLanguage": ["id", "en"]
  }],
  "sameAs": ["https://www.unjani.ac.id/", "<...settings.sosmed[].url>"]
}
```

`https://pendaftaran.unjani.ac.id/` dikeluarkan dari `sameAs`, karena itu portal pendaftaran, bukan profil organisasi.

### 6.6 Konfigurasi nginx (aaPanel → Website → pmb.unjani.ac.id → Config)

Letakkan di awal blok `server` yang melayani port 80 dan 443:

```nginx
if ($scheme = http) { return 301 https://pmb.unjani.ac.id$request_uri; }
if ($host = www.pmb.unjani.ac.id) { return 301 https://pmb.unjani.ac.id$request_uri; }
```

Catatan:
- Hapus rule redirect lama yang mengarahkan `www` ke `http://`.
- Jangan pakai toggle "Force HTTPS" bawaan aaPanel. Toggle itu memakai `$host`, sehingga `http://www.` menjadi 2 hop.
- Jalankan `nginx -t` sebelum reload.

## 7. Risiko dan Rollback

| Risiko | Mitigasi |
|---|---|
| Redirect 308 disimpan permanen oleh browser dan Google [SEO-IRREVERSIBLE] | Uji tabel §6.3 di dev dulu (T.2.5). Rollback: hapus rule dan kembalikan folder dari cadangan. Cache browser pengguna tidak bisa ditarik. |
| `noindex` pada `/en` mengeluarkan halaman dari indeks [SEO-IRREVERSIBLE] | Hanya untuk konten tanpa `judul_en` (D-07). Bila salah, hapus `hanyaId`; halaman kembali terindeks setelah di-crawl ulang. |
| Ekstraksi `muatDataBiaya` mengubah kalkulator beranda | Bandingkan HTML section `#kalkulator` sebelum dan sesudah (T.2.0). |
| `toSlug` mengubah slug lama saat jalur atau kategori diedit (`PUT` memanggil `toSlug` pada slug yang ada) | Assert idempotensi di T.1.9. |

Simpan cadangan folder proyek sebelum T.2.5. Folder ini bukan repo git.

## 8. Koreksi terhadap AUDIT-SEO.md

| Temuan audit | Kondisi kode sebenarnya |
|---|---|
| M13: halaman tag/kategori perlu canonical | Sudah benar. `buildMetadata({ path: '/artikel' })` menghasilkan canonical tanpa query. |
| P3: counter perlu dirender SSR | Angka final sudah di-SSR (`CountUp.tsx:51-61`). Crawler yang menjalankan JS menangkap angka di tengah animasi. Solusinya D-05. |
| P9: hero tanpa `sizes`/`priority` | `HeroSlider.tsx:120-124` sudah memakai `fill`, `priority`, dan `sizes`. `w=3840` di `src` adalah perilaku normal next/image. Hanya `fetchpriority` yang perlu dicek. |
| P4: tidak ada x-default | Middleware next-intl mungkin sudah mengirimnya di header `Link` (tidak terlihat oleh Firecrawl). HTML tetap ditambah (FR-SEO-04). |
| K1: aktifkan HSTS | Sudah dikirim app (`next.config.mjs:28`). Yang kurang hanya redirect di nginx. |
| P5: `exam.pmb`, `http://pendaftaran`, `s.unjani` | Tidak ada di `src/`. Link ini tersimpan di konten DB (CMS), jadi diperbaiki lewat admin, bukan deploy. |
| K4: kalkulator kosong | Sesuai FR-53 (biaya jadwal berakhir disaring). Penyebabnya data 2027/2028 belum diinput, bukan bug. |
| Data mentah di `/tmp/claude-0/...` | Path Linux di mesin lain, tidak tersedia di folder ini. Bukti audit tidak bisa diverifikasi ulang secara lokal. |

Temuan tambahan (dilaporkan, tidak diperbaiki di rilis ini):
- `AGENTS.md` dan `docs/ARCHITECTURE.md` menyebut v1.2.0, port 9531, dan Next 16.2.4.
- `package.json` berisi `2.0.0`, port `9532`, dan Next `16.3.8`.
