# Spesifikasi Rencana Implementasi PMB UNJANI v2.0.0 — Redesign Varian 02 Gold & Pembenahan Routing

Dokumen perencanaan teknis pembaruan versi 2.0.0: Redesign antarmuka publik dan halaman login CMS Admin berbasis desain FigCraft Varian 02 Gold, serta penutupan rute mandiri `/jalur-masuk` dan `/biaya-kuliah` yang dialihkan ke anchor beranda `/#jalur-seleksi` dan `/#kalkulator`.

---

## 1. Ringkasan & Ruang Lingkup

1. **Tujuan**:
   - Menyelaraskan seluruh antarmuka publik (beranda, kontak, pengumuman list/detail, artikel list/detail) dan login CMS Admin dengan referensi desain visual Varian 02 Gold (`docs/update/v.2.0.0/preview/*.png`).
   - Menghapus halaman mandiri `/jalur-masuk` dan `/biaya-kuliah` sesuai arahan `docs/update/v.2.0.0/MustBeFixed.txt`.
   - Mengalihkan URL lama (termasuk varian bahasa `/en/` dan `/id/` serta alias WordPress) langsung ke target anchor beranda `/#jalur-seleksi` dan `/#kalkulator` tanpa redirect berantai (single hop 308).
   - Memastikan interaktivitas dinamis (form kalkulator biaya, data CMS, multi-step login admin dengan reCAPTCHA & MFA) tetap berfungsi 100% tanpa regresi.

2. **Batasan Global**:
   - Stack: Next.js 16.3.8, React 19.2.5, TypeScript 5.6.2, Tailwind CSS 3.4.13, Mongoose 8.24.5, next-intl 4.9.1.
   - **Dilarang menambah dependensi npm baru**. Tidak ada `@testing-library/*`; pengujian otomatis wajib menggunakan script Node.js builtin `scripts/check-v2.mjs` berbasis `node:assert/strict`.
   - Konfigurasi autentikasi, token auth, dan `.env` tidak boleh diubah perilakunya.
   - Semua copy teks multibahasa menggunakan kamus `messages/id.json` dan `messages/en.json`.
   - Komponen CMS admin tidak boleh mengalami kerusakan visual akibat token global Tailwind.

---

## 2. Token Desain (Varian 02 Gold)

| Token | Nilai | Peruntukan |
|---|---|---|
| `--color-bg` | `#F2F5F0` | Latar belakang halaman |
| `--color-alt` | `#E3ECE3` | Latar belakang section alternatif |
| `--color-ink` | `#10281D` | Teks utama |
| `--color-mut` | `#576B5F` | Teks sekunder / muted |
| `--color-ln` | `#CBD9CD` | Garis batas (border) |
| `--color-pri` | `#063F2A` | Warna hijau primer (tombol, section band, aksen) |
| `--color-soft` | `#D9EADC` | Fills hijau lembut |
| `--color-acc` | `#D4AF37` | **Aksen Gold** (CTA, badges, chips aktif, nomor sorotan) |
| `--color-ac` | `#1D2114` | Teks di atas latar belakang gold |
| `--color-foot` | `#06281D` | Latar belakang footer dan header band gelap |
| `--color-ff` | `#FFFFFF` | Teks footer dan teks di atas hijau gelap |
| `--font-display` | `Montserrat` | Font heading utama via `next/font/google` |
| `--font-body` | `Inter` | Font body teks via `next/font/google` |
| `--radius` | `8px` (`0.5rem`) | **Radius kartu dan kontainer** (bukan 20px) |
| `--radius-btn` | `8px` (`0.5rem`) | **Radius tombol** |
| Tinggi Hero Beranda | `900px` (desktop), mengikuti isi (mobile) | Banner visual utama beranda |
| Tinggi Hero Subhalaman | `480px` (desktop), `440px` (mobile) | Banner halaman kontak, pengumuman list, artikel list |
| Tinggi Hero Detail Pengumuman | `520px` (desktop), `480px` (mobile) | Banner detail pengumuman |

---

## 3. Strategi Pengujian (TDD Node Builtin & Manual Browser)

1. **Uji Otomatis (Static & Architectural Contract)**:
   - Dijalankan via `node scripts/check-v2.mjs <task-num>` atau `node scripts/check-v2.mjs all`.
   - Menggunakan modul bawaan `node:assert/strict` dan `node:fs`.
   - Menguji kebenaran konfigurasi redirect, ketiadaan rute terhapus di sitemap, integrasi font, palet Tailwind, struktur section ID, props komponen, serta keberadaan fungsi auth login tanpa dependensi pihak ketiga.

   - Bentuk script (satu file, tanpa dependency):
     ```js
     // scripts/check-v2.mjs — jalankan: node scripts/check-v2.mjs <1..9|all>
     import assert from 'node:assert/strict';
     import { readFileSync, existsSync } from 'node:fs';
     const baca = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
     const tasks = {
       1: async () => {
         // next.config.mjs default export = OBJECT hasil withNextIntl(nextConfig), BUKAN function.
         const cfg = (await import('../next.config.mjs')).default;
         const r = await cfg.redirects();
         const ke = (s) => r.find((x) => x.source === s)?.destination;
         assert.equal(ke('/jalur-masuk'), '/#jalur-seleksi');
         // ...lanjutan per aturan Task 1
       },
       // 2..9: cek teks sumber via baca(); file .ts/.tsx TIDAK di-import (node tanpa tsx/loader).
     };
     const pilih = process.argv[2] ?? 'all';
     for (const [n, fn] of Object.entries(tasks)) if (pilih === 'all' || pilih === n) { await fn(); console.log(`Task ${n} OK`); }
     ```
   - Import `next.config.mjs` aman (hanya butuh `next-intl/plugin` yang sudah terpasang). `tailwind.config.ts`, `src/**/*.tsx`, `src/app/sitemap.ts` dicek lewat pembacaan teks (regex/`includes`), karena meng-import-nya butuh loader TS/DB.
   - Assert untuk task berikutnya ditambahkan bertahap; `all` hanya menjalankan task yang sudah ada.

2. **Pemisahan Validasi Visual & Runtime (Manual)**:
   - *Penting*: Lulusnya script assert source code HANYA membuktikan keabsahan sintaks dan kontrak arsitektur, BUKAN bukti visual pixel rendering di browser!
   - Verifikasi visual (kesesuaian layout dengan `docs/update/v.2.0.0/preview/*.png`, responsivitas mobile 375px hingga desktop 1440px, kontras warna, dan kehalusan smooth scroll) dilakukan secara manual di browser pada dev server (`yarn dev`).

---

## 4. Rincian Rencana Tugas (Task 1 s.d. 9)

---

### Task 1: Pembenahan Routing — Redirects, Sitemap, dan Penghapusan Halaman Lama

**File Target:**
- Ubah: `next.config.mjs`
- Ubah: `src/app/sitemap.ts`
- Hapus: `src/app/[locale]/(public)/jalur-masuk/page.tsx`
- Hapus: `src/app/[locale]/(public)/biaya-kuliah/page.tsx`

**Antarmuka Eksisting:**
- `next.config.mjs` mengekspor konfigurasi Next.js (`withNextIntl(nextConfig)`) yang memiliki metode async `redirects()`.
- Objek redirect berisi array tuple `[source, destination]` yang dipetakan secara seragam ke `{ source, destination, permanent: true }`.
- `src/app/sitemap.ts` mengekspor fungsi `sitemap()` yang mendaftarkan URL statis melalui fungsi `localizedEntries`.

**Aturan Khusus Task 1:**
- Tidak boleh mencampur tipe objek `{ source, destination }` ke dalam array tuple `[source, destination]` pada `next.config.mjs`.
- Semua alias lama WordPress (`/jalur-seleksi`, `/biaya-pendidikan`, `/infomasi-biaya`, `/semuajalur`, `/jalur-lanjutan`, `/jalur-pmdk-3`, `/jalur-magister`) yang sebelumnya menuju ke `/jalur-masuk` atau `/biaya-kuliah` harus langsung diarahkan ke target akhir: `/#jalur-seleksi` atau `/#kalkulator` untuk mencegah redirect berantai.
- Mengakomodasi prefix `/id/` eksplisit (misal `/id/jalur-masuk` -> `/#jalur-seleksi`, `/id/biaya-kuliah` -> `/#kalkulator`).
- Tabel redirect final (semua 308, satu hop). Tujuan locale `en` ditulis `/en#...` (bukan `/en/#...`) agar tidak memicu redirect trailing-slash tambahan:

  | Source | Destination |
  |---|---|
  | `/jalur-masuk`, `/id/jalur-masuk`, `/jalur-seleksi`, `/id/jalur-seleksi`, `/semuajalur`, `/jalur-lanjutan`, `/jalur-pmdk-3`, `/jalur-magister` | `/#jalur-seleksi` |
  | `/en/jalur-masuk`, `/en/jalur-seleksi` | `/en#jalur-seleksi` |
  | `/biaya-kuliah`, `/id/biaya-kuliah`, `/biaya-pendidikan`, `/id/biaya-pendidikan`, `/infomasi-biaya` | `/#kalkulator` |
  | `/en/biaya-kuliah`, `/en/biaya-pendidikan` | `/en#kalkulator` |
  | Rule lain existing (`/jadwal`, `/prodi`, `/jalur-ods`, `/jadwal-pmb-september`, varian `/en/`) | tetap |

- Assert anti-chain: untuk setiap rule, `destination` tanpa `#...` tidak boleh sama dengan `source` rule lain.
- `/id/*` lain (bukan rule di atas) tetap dilayani next-intl (`localePrefix: 'as-needed'` mengalihkan `/id/x` ke `/x`); jangan ubah `src/i18n/routing.ts` maupun `src/proxy.ts`.
- Hapus entri `/jalur-masuk` dan `/biaya-kuliah` dari `src/app/sitemap.ts`.
- Cari referensi tersisa: `grep -rn "jalur-masuk\|biaya-kuliah" src messages` — selain redirect, semua tautan internal (mis. Navbar/Footer/Hero/halaman lain) diganti ke anchor di task pemilik file.
- Hapus file `jalur-masuk/page.tsx` dan `biaya-kuliah/page.tsx` beserta foldernya bila kosong.

**Langkah Kerja:**
1. Buat uji assert Task 1 di `scripts/check-v2.mjs`.
2. Jalankan `node scripts/check-v2.mjs 1` (harus gagal/merah).
3. Terapkan pembaruan tuple redirect di `next.config.mjs`.
4. Hapus entri rute di `src/app/sitemap.ts`.
5. Hapus file `src/app/[locale]/(public)/jalur-masuk/page.tsx` dan `src/app/[locale]/(public)/biaya-kuliah/page.tsx`.
6. Jalankan `node scripts/check-v2.mjs 1` (harus lulus/hijau).
7. Commit hanya path milik Task 1.

---

### Task 2: Tipografi Montserrat Asli, Token Desain Tailwind, Navbar & Footer

**File Target:**
- Ubah: `src/app/layout.tsx`
- Ubah: `tailwind.config.ts`
- Ubah: `src/components/public/Navbar.tsx`
- Ubah: `src/components/public/Footer.tsx`

**Antarmuka Eksisting:**
- `src/app/layout.tsx` mengimpor font dari `next/font/google` dan menyuntikkan variabel `--font-sans` dan `--font-display`.
- `tailwind.config.ts` mendefinisikan palet `brand`, `accent`, `ink`, `surface`, serta `borderRadius`.
- `Navbar.tsx` menerima prop `settings: PublicSettings | null` dan mendefinisikan `navLinks`.
- `Footer.tsx` menerima prop `settings: PublicSettings | null`.

**Aturan Khusus Task 2:**
- Di `src/app/layout.tsx`, ganti `Plus_Jakarta_Sans` dengan `Montserrat` asli (`weight: ['500', '600', '700', '800']`, `variable: '--font-display'`).
- Di `tailwind.config.ts`, perbarui NILAI palet (`brand.DEFAULT = '#063F2A'`, `brand.900 = '#06281D'`, `accent.DEFAULT = '#D4AF37'`, `accent.600 = '#C4A030'`, `ink.DEFAULT = '#10281D'`, `ink.muted = '#576B5F'`); semua KUNCI shade existing (`brand.50..900`, `accent.50..700`, `ink.soft`, `surface`) tetap ada karena dipakai admin. Jangan ubah `borderRadius` global (`2xl`/`3xl`/`DEFAULT`) — admin bergantung padanya. Radius 8px publik memakai kelas bawaan `rounded-lg` (0.5rem) di komponen publik. Halaman admin selain login dicek manual (dashboard, satu modul tabel, satu modal) setelah ganti warna.
- Di `Navbar.tsx`, perbarui link `jalurSeleksi` ke `/#jalur-seleksi` dan `biaya` ke `/#kalkulator`. Tombol CTA "Daftar Sekarang" berlatar Gold (`bg-[#D4AF37] text-[#1D2114] hover:bg-[#C4A030]`), radius 8px. Navbar transparan di atas hero: tetap satu `<Navbar>` di `src/app/[locale]/(public)/layout.tsx`; `<header>` jadi `fixed inset-x-0 top-0` transparan (teks putih) selama berada di atas hero, berubah solid putih setelah scroll (state client `scrolled` via listener `scroll` pasif/IntersectionObserver), transisi warna dimatikan dengan `motion-reduce:transition-none`. Pertahankan `aria-label`, `aria-expanded`, `inert` menu mobile, fokus terlihat (`focus-visible:ring`). Semua halaman publik memakai hero/band gelap di bagian atas (beranda, kontak, pengumuman, artikel list); halaman tanpa hero gelap (artikel detail, faq, jadwal-pmb, 404) memakai varian solid sejak awal — tentukan lewat `usePathname()` atau prop, jangan duplikasi navbar.
- Di `Footer.tsx`, ubah latar menjadi hijau gelap pekat `bg-[#06281D]`, teks `#FFFFFF`, tautan kalkulator ke `/#kalkulator`, tautan jalur ke `/#jalur-seleksi`, dan tautan email panitia berwarna gold `#D4AF37`.

**Langkah Kerja:**
1. Buat uji assert Task 2 di `scripts/check-v2.mjs`.
2. Jalankan `node scripts/check-v2.mjs 2` (harus gagal).
3. Perbarui `src/app/layout.tsx`, `tailwind.config.ts`, `Navbar.tsx`, dan `Footer.tsx`.
4. Jalankan `node scripts/check-v2.mjs 2` (harus lulus).
5. Uji visual di browser: pastikan font heading adalah Montserrat dan warna footer/navbar sesuai.
6. Commit hanya path milik Task 2.

---

### Task 3: Redesign Beranda (Landing Page) — Hero, Section Berurutan & Tata Letak

**File Target:**
- Ubah: `src/app/[locale]/(public)/page.tsx`
- Ubah: `src/components/public/Hero.tsx`
- Ubah: `src/components/public/DokumenList.tsx`
- Ubah: `src/components/public/JalurList.tsx` & `src/components/public/JalurAccordion.tsx`
- Ubah: `src/components/public/JadwalHighlights.tsx`
- Ubah: `src/components/public/KalkulatorForm.tsx`
- Ubah: `src/components/public/ProgramStudiExplorer.tsx`
- Ubah: `src/components/public/PengumumanList.tsx`
- Ubah: `src/components/public/ArtikelSection.tsx`
- Ubah: `src/components/public/FAQAccordion.tsx`

**Antarmuka Eksisting:**
- `page.tsx` memuat data paralel dari model MongoDB: `Settings`, `JalurSeleksi`, `Jadwal`, `Dokumen`, `Pengumuman`, `Artikel`, `PageContent`, `FAQ`, `Fakultas`, `ProgramStudi`, `Biaya`, dan `Popup`.
- Meneruskan data hasil query ke komponen-komponen publik terkait.

**Aturan Khusus Task 3 (Konsistensi `variant-02.png`):**
- **Navbar Transparan**: Terintegrasi di bagian atas hero tanpa duplikasi tag `<Navbar>`.
- **Hero**: Tinggi 900px desktop; di mobile tinggi mengikuti isi (tanpa tinggi minimum tetap) agar tidak ada ruang kosong besar di atas konten, latar = `heroImages` dari `PageContent` kunci `hero` (via `HeroSlider` existing; jangan hardcode path upload), gradient gelap, badge `t('badge', { tahun: tahunAjaran })`, judul/subjudul dari `PageContent`, CTAs (Daftar Sekarang gold, Hitung Biaya outline putih ke `/#kalkulator`), statistik `jumlahFakultas`/`jumlahProgramStudi` (angka 11/48 di PNG hanya contoh data), dan kartu aktif = `HeroGelombangInfo` dari `activeJadwal`. Tidak ada tahun/periode/angka hardcode.
- **Data CMS**: daftar jalur + persyaratan dari `JalurSeleksi` (`persyaratan[]`, `badge`, `ringkasan`), jadwal dari `Jadwal`, dokumen dari `Dokumen`, kartu fakultas dari `Fakultas`/`ProgramStudi`, tab FAQ dari enum `FAQ.kategori` (`Teknis|Biaya|Jadwal`), pengumuman/artikel dari model. Teks statis UI (judul section, label tombol) via `messages/*.json`.
- **Section IDs & Scroll Offset**: Setiap section beranda memiliki ID anchor dan `scroll-mt-24` (agar tidak tertutup navbar saat scroll):
  - Dokumen Resmi: `id="manual-book"`
  - Jalur Seleksi: `id="jalur-seleksi"`
  - Jadwal Penerimaan: `id="jadwal"`
  - Kalkulator Biaya: `id="kalkulator"`
  - Pengumuman & Artikel: `id="pengumuman"` dan `id="artikel"`
  - Pertanyaan Umum: `id="faq"`
  - Banner CTA: `id="cta"`
- **Dokumen Resmi**: Tata letak **aside/list** (kiri: judul "Biaya Pendidikan & Buku Panduan" dan deskripsi; kanan: daftar vertikal kartu dokumen PDF dengan badge, ukuran file, tombol "Lihat" dan "Unduh", serta catatan kalkulator di bagian bawah).
- **Jalur Seleksi**: Tata letak aside (kiri: kartu ringkasan persyaratan jalur aktif dengan tombol "Daftar Jalur Ini"; kanan: list kartu 7 jalur seleksi dengan nomor, nama, badge, deskripsi, dan ikon panah).
- **Jadwal Penerimaan**: Wide layout dengan countdown timer dan tahapan seleksi.
- **Biaya Pendidikan (Kalkulator)**: Solid primary green band (`bg-[#063F2A]`). **Form kalkulator interaktif tetap ditampilkan saat data biaya tersedia di DB**. Empty state ("Biaya pendidikan sedang disusun") HANYA ditampilkan jika `records.length === 0`.
- **Fakultas & Program Studi**: Kolom pencarian, 11 kartu fakultas (menampilkan jenjang & jumlah prodi), dan 1 kartu ringkasan gold ("48 Program studi di 11 fakultas").
- **Pengumuman & Artikel**: Layout kombinasi (kiri: pengumuman disematkan dengan tanggal badge besar; kanan: 3 kartu artikel terbaru dengan foto cover dan meta penulis).
- **Pertanyaan Umum (FAQ)**: Centered layout dengan tab kategori ("Teknis", "Biaya", "Jadwal") dan accordion list max-width 880px.
- **Banner CTA Bawah**: Solid Gold Band `bg-[#D4AF37]` dengan teks `#1D2114`, judul "Siap Menjadi Bagian UNJANI?", tombol utama hitam dan tombol outline.
- **Fitur Dipertahankan**: Komponen `InstagramFeed` dan `LandingPopup` tetap terpasang.

**Langkah Kerja:**
1. Buat uji assert Task 3 di `scripts/check-v2.mjs`.
2. Jalankan `node scripts/check-v2.mjs 3` (harus gagal).
3. Perbarui `page.tsx` dan komponen-komponen pendukungnya.
4. Jalankan `node scripts/check-v2.mjs 3` (harus lulus).
5. Uji visual di browser: periksa kesesuaian dengan `variant-02.png` dan uji fungsi scroll anchor.
6. Commit hanya path milik Task 3.

---

### Task 4: Redesign Halaman Kontak

**File Target:**
- Ubah: `src/app/[locale]/(public)/kontak/page.tsx`

**Antarmuka Eksisting:**
- Mengambil pengaturan kontak dari `loadSiteSettings()` / `getSettings()` dan data FAQ dari model `FAQ`.

**Aturan Khusus Task 4 (Konsistensi `variant-02-kontak-desktop.png`):**
- Hero band setinggi 480px (mobile 440px) dengan latar render kampus dan gradient overlay gelap, breadcrumb "Beranda / Kontak", eyebrow "BUTUH BANTUAN?", judul "Hubungi Kami", dan subdeskripsi.
- Konten utama dua kolom:
  - Kolom kiri: Kartu putih "Sekretariat PMB", teks informasi, foto kampus Cimahi, alamat resmi, dan tombol hijau `bg-[#063F2A]` "Buka di Maps →".
  - Kolom kanan: Kartu hijau gelap `bg-[#063F2A]` "Kanal Resmi", teks pengantar, email gold `admisi@unjani.ac.id`, nomor telepon `(022) 6631564`, tombol gold `bg-[#D4AF37]` "Chat via WhatsApp →", dan chips media sosial bergaris putih.
- Email, telepon, WhatsApp, sosmed, alamat diambil dari `Settings`/`PageContent` (nilai di PNG hanya contoh); item kosong disembunyikan.
- Section bawah: "Mungkin jawabannya sudah ada" menampilkan preview 3 item FAQ dalam format accordion dengan tautan "Lihat semua pertanyaan →".

**Langkah Kerja:**
1. Buat uji assert Task 4 di `scripts/check-v2.mjs`.
2. Jalankan `node scripts/check-v2.mjs 4` (harus gagal).
3. Terapkan perubahan pada `src/app/[locale]/(public)/kontak/page.tsx`.
4. Jalankan `node scripts/check-v2.mjs 4` (harus lulus).
5. Uji visual di browser terhadap preview kontak desktop dan mobile.
6. Commit hanya path milik Task 4.

---

### Task 5: Redesign Halaman Pengumuman (List & Detail)

**File Target:**
- Ubah: `src/app/[locale]/(public)/pengumuman/page.tsx`
- Ubah: `src/app/[locale]/(public)/pengumuman/[slug]/page.tsx`

**Antarmuka Eksisting:**
- List: Query Mongoose `Pengumuman.find({ aktif: true })` dengan pagination dan filter pinned.
- Detail: Query `Pengumuman.findOne({ slug, aktif: true })`, sanitasi HTML konten via `sanitizeRichText`, dan SEO metadata.

**Aturan Khusus Task 5 (Konsistensi `variant-02-pengumuman-*.png`):**
- **List Page**:
  - Hero band 480px, breadcrumb "Beranda / Pengumuman", eyebrow "INFORMASI TERBARU", judul "Pengumuman".
  - Kartu utama pinned (hijau gelap `bg-[#063F2A]`, gambar cover, badge gold "Penting", judul, deskripsi, dan tombol gold "Baca selengkapnya →").
  - Daftar vertikal pengumuman reguler dengan tanggal badge besar (hari angka besar, bulan/tahun), judul, ringkasan, dan panah detail.
  - Pagination numerik dengan tombol navigasi "Berikutnya →".
- **Detail Page**:
  - Hero band 520px, breadcrumb "Beranda / Pengumuman / Detail", judul pengumuman, badge "Penting" dan tanggal terbit.
  - Tautan navigasi "Kembali ke Pengumuman →".
  - Tata letak dua kolom:
    - Kolom kiri: Isi lengkap pengumuman (`konten` rich text tersanitasi). Kotak "Jadwal penting" dan daftar dokumen di PNG adalah bagian isi konten CMS — model `Pengumuman` tidak punya field jadwal/dokumen, jadi JANGAN hardcode; cukup styling `prose` agar tabel/list/tautan PDF di konten tampil sesuai gambar.
    - Kolom kanan: Kartu sidebar gold `bg-[#D4AF37]` "Siap mendaftar?" dengan tombol hitam "Daftar Sekarang →", serta daftar "Pengumuman lainnya".

**Langkah Kerja:**
1. Buat uji assert Task 5 di `scripts/check-v2.mjs`.
2. Jalankan `node scripts/check-v2.mjs 5` (harus gagal).
3. Terapkan perubahan pada `page.tsx` dan `[slug]/page.tsx`.
4. Jalankan `node scripts/check-v2.mjs 5` (harus lulus).
5. Uji visual di browser terhadap preview pengumuman desktop dan mobile.
6. Commit hanya path milik Task 5.

---

### Task 6: Redesign Halaman Artikel (List & Detail Editorial)

**File Target:**
- Ubah: `src/app/[locale]/(public)/artikel/page.tsx`
- Ubah: `src/app/[locale]/(public)/artikel/[slug]/page.tsx`

**Antarmuka Eksisting:**
- List: Query model `Artikel` layak tampil publik dengan filter kategori/tag dan pencarian.
- Detail: Query `Artikel.findOne({ slug, ... })`, sanitasi rich text, artikel terkait.

**Aturan Khusus Task 6 (Konsistensi `variant-02-artikel-*.png`):**
- **List Page**:
  - Hero band 480px, breadcrumb "Beranda / Artikel", eyebrow "INFORMASI DAN BERITA", judul "Artikel PMB".
  - Bilah pencarian (input teks + dropdown kategori + tombol hijau "Cari") dan baris chips tag ("Semua", "Berita PMB", "Panduan", "Beasiswa", "Kampus").
  - Kartu artikel unggulan besar di bagian atas (gambar lanskap di kiri, konten dan link di kanan).
  - Grid artikel reguler (3 kolom kartu) dengan gambar, meta penulis, tanggal, judul, dan excerpt.
  - Kontrol pagination numerik.
- **Detail Page (PENTING)**:
  - **Tata Letak Single-Column Centered Editorial** (bukan 2 kolom sidebar, bukan background hero foto di header!).
  - Tautan "Kembali ke Artikel →".
  - Badge kategori dan perkiraan waktu baca — hanya bila field tersedia di model `Artikel` (cek `src/models/Artikel.ts`; waktu baca boleh dihitung dari panjang `isi`). Chips tag/kategori di list juga hanya dari data; bila model tidak punya kategori/tag, sembunyikan dan laporkan, jangan hardcode.
  - Judul H1 besar editorial yang nyaman dibaca.
  - Info penulis (nama penulis, tanggal publikasi).
  - **Gambar cover artikel diletakkan di tengah badan konten** (inline).
  - Paragraf isi yang nyaman dibaca (lebar kontainer terukur ~768px - 800px).
  - Quote callout bergaris tepi kiri tebal warna emas (`border-l-4 border-[#D4AF37]`).
  - Baris tag chips di bawah artikel.
  - Section "Artikel terkait" di bagian bawah berupa grid 3 kartu artikel.

**Langkah Kerja:**
1. Buat uji assert Task 6 di `scripts/check-v2.mjs`.
2. Jalankan `node scripts/check-v2.mjs 6` (harus gagal).
3. Terapkan perubahan pada `artikel/page.tsx` dan `artikel/[slug]/page.tsx`.
4. Jalankan `node scripts/check-v2.mjs 6` (harus lulus).
5. Uji visual di browser terhadap preview artikel desktop dan mobile.
6. Commit hanya path milik Task 6.

---

### Task 7: Redesign Halaman Login Admin (Split Layout Desktop & Preservasi Fitur Auth)

**File Target:**
- Ubah: `src/app/admin/login/page.tsx`

**Antarmuka Eksisting:**
- State autentikasi multi-langkah: `langkah` (`kredensial`, `kode`, `daftar`, `pemulihan`, `info-pemulihan`).
- State loading (`loading`), error (`err`), email/password, show password toggle (`showPass`).
- reCAPTCHA dinamis: memuat script Google saat server meminta, render explicit widget ID, verifikasi token, reset widget saat gagal.
- Navigasi aman dashboard via `safeNextPath(nextParam)`.
- Pembatalan MFA via `/api/auth/logout`.

**Aturan Khusus Task 7 (Konsistensi `variant-02-login-desktop.png`):**
- **Layout Desktop Split Screen**:
  - Sisi kiri (50%): Panel hijau gelap dengan gambar 3D render kampus UNJANI, gradient overlay, logo PMB UNJANI / Panel Admin di sudut atas, judul "Kelola informasi PMB dari satu tempat", deskripsi, serta 3 poin fitur dengan kotak ceklis hijau pada latar gold `#D4AF37`:
    1. Multi Jalur Seleksi (Reguler, Prestasi, Beasiswa)
    2. Jadwal Terintegrasi (Pantau gelombang pendaftaran real-time)
    3. Informasi Biaya Transparan (Biaya per prodi & kelas tersedia lengkap)
  - Sisi kanan (50%): Form login dalam kartu berlatar bersih dengan heading "Selamat datang", subjudul, form input email (placeholder `admin@unjani.ac.id`), form password dengan tombol toggle "Tampilkan", checkbox "Ingat saya" HANYA bila sudah ada perilaku remember di kode (per base `9e08148` grep `remember|Ingat` di login nihil — jangan tambah checkbox palsu; tanya user bila tetap ingin), tombol submit hijau `bg-[#063F2A]` "Masuk →", link bantuan "Lupa password? Hubungi superadmin PMB.", dan copyright.
- **Layout Mobile**: Tampilan bertumpuk (stacked) responsif dengan panel ilustrasi ringkas di atas form login.
- **WAJIB DIPERTAHANKAN**:
  - Dilarang keras menghapus atau menyederhanakan alur auth: widget reCAPTCHA, penanganan MFA, validasi token, error message alert, redirect aman, dan state loading wajib dipertahankan seutuhnya!

**Langkah Kerja:**
1. Buat uji assert Task 7 di `scripts/check-v2.mjs`.
2. Jalankan `node scripts/check-v2.mjs 7` (harus gagal).
3. Terapkan penataan ulang markup split screen pada `src/app/admin/login/page.tsx` dengan mempertahankan seluruh logic handler.
4. Jalankan `node scripts/check-v2.mjs 7` (harus lulus).
5. Uji visual di browser terhadap preview login desktop dan mobile.
6. Commit hanya path milik Task 7.

---

### Task 8: Verifikasi Menyeluruh, Aksesibilitas & Build Production

**File Target:**
- Verifikasi: `src/styles/globals.css`, `tailwind.config.ts`, `src/app/layout.tsx`, serta seluruh komponen publik dan admin.

**Kriteria Keberhasilan:**
1. **Smooth Scroll & Reduced Motion**:
   - Klik tautan navigasi dan footer mengarahkan viewport dengan halus ke target anchor (`#jalur-seleksi`, `#kalkulator`, dll.).
   - Pada browser dengan `prefers-reduced-motion: reduce`, perilaku scroll seketika (instant) tanpa animasi transisi, dan animasi dekoratif dinonaktifkan.
2. **Keterbacaan & Kontras**:
   - Seluruh teks memenuhi rasio kontras WCAG AA.
   - Variabel font display Montserrat dan sans Inter diterapkan dengan rapi tanpa layout shift yang mengganggu.
3. **Kompatibilitas CMS Admin**:
   - Halaman dashboard dan modul CRUD admin tidak mengalami kerusakan styling akibat perubahan tema.
4. **Verifikasi Build & Lint**:
   - `yarn lint` lulus bersih tanpa warning/error.
   - `yarn build` menghasilkan bundle produksi Next.js yang valid dan bebas error TypeScript.
5. **Eksekusi Pengujian TDD**:
   - `node scripts/check-v2.mjs all` menghasilkan status 100% lulus.

**Langkah Kerja:**
1. Jalankan `node scripts/check-v2.mjs all`.
2. Jalankan `yarn lint`.
3. Jalankan `yarn build`.
4. Verifikasi manual pengalaman pengguna di browser.
5. Commit perubahan perbaikan bila ada.

---

### Task 9: Tata Kelola Rilis v2.0.0

**File Target:**
- `package.json`
- `CHANGELOG.md`

**Aturan Rilis:**
1. Pastikan tag git yang ada telah diperiksa (saat ini belum ada tag di repositori).
2. Verifikasi nomor versi `2.0.0` pada `package.json:3`.
3. Catat rincian perubahan versi `[2.0.0]` pada `CHANGELOG.md` mencakup:
   - Redesign visual Varian 02 Gold FigCraft untuk Beranda, Kontak, Pengumuman, Artikel, dan Login Admin.
   - Penghapusan halaman `/jalur-masuk` dan `/biaya-kuliah` serta pengalihan permanen ke anchor beranda.
   - Penerapan font Google Montserrat untuk display heading.
   - Penyesuaian token warna dan radius kartu/tombol 8px.
4. **PENTING**: Dilarang menjalankan `git push --tags` atau push ke remote secara otomatis. Seluruh proses pembuatan git tag dan rilis publik WAJIB menunggu konfirmasi eksplisit dari pengguna setelah verifikasi tuntas.

---

## 5. Ringkasan Ketergantungan dan Urutan Eksekusi

```text
Task 1 (Routing & Hapus Halaman)
   │
   ▼
Task 2 (Font Montserrat, Tailwind Tokens, Navbar & Footer)
   │
   ▼
Task 3 (Redesign Beranda / Landing Page)
   │
   ├───────────────────────────┬───────────────────────────┐
   ▼                           ▼                           ▼
Task 4 (Kontak)          Task 5 (Pengumuman)         Task 6 (Artikel)
   │                           │                           │
   └───────────────────────────┼───────────────────────────┘
                               │
                               ▼
                         Task 7 (Admin Login)
                               │
                               ▼
                         Task 8 (Verifikasi & Build)
                               │
                               ▼
                         Task 9 (Changelog & Rilis)
```
