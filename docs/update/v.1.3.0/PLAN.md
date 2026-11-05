# PLAN v1.3.0 — Rencana Teknis

Basis: SRS.md, IMPACT.md, SEO-AUDIT.md, ARCHITECTURE.md, DATA-MODEL.md, UI-CURRENT.md, AGENTS.md. Tidak ada kode di dokumen ini — hanya apa yang diubah, urutannya, dan alasannya.

## 0. Penilaian atas Pembagian Fase (diminta untuk dikatakan bila keliru)

Pembagian A (fondasi SEO) → B (artikel) **benar arahnya, tapi definisi A perlu diperluas** — dan saya memperluasnya dengan sengaja:

1. Definisi A yang sempit (rendering, meta, canonical, URL, sitemap, redirect) tidak menampung FR-17 (event analytics), FR-18 (UTM), FR-19 (kompresi upload), FR-21 (singkatan) — padahal keempatnya hanya menyentuh halaman/komponen EXISTING. Kalau digeser ke B, Fase B jadi campuran "modul baru + mengutak-atik halaman hidup" — persis kombinasi yang IMPACT.md §9 sebut paling berbahaya.
2. Maka prinsip pembagian di rencana ini: **FASE A = semua perubahan pada permukaan existing** (metadata, sitemap, CTA, upload hero, singkatan). **FASE B = murni penambahan** (koleksi, halaman, route baru) + tiga titik sentuh existing yang tak terhindarkan (landing section, permissions, sitemap entry, editor prop). Dengan ini, regresi existing dites tuntas SEKALI di gerbang akhir A, dan B nyaris aditif.
3. Dua item "A" dari definisi asli tidak menghasilkan pekerjaan: **rendering** sudah SSR penuh (SEO-AUDIT §B — bukan CSR; tidak ada yang perlu diubah) dan **redirect** tidak dibutuhkan (tidak ada URL existing yang berubah — IMPACT §4). Keduanya jadi butir verifikasi, bukan langkah.

Ketergantungan nyata yang membuat A-dulu-B-kemudian wajib: artikel memakai kontrak metadata/hreflang (A2), perilaku sitemap (A3), pipeline kompresi gambar (A4), dan helper analytics (A5). Membangun B sebelum itu berarti membangun di atas kontrak yang akan berubah.

## 0-bis. Bagian SRS yang TIDAK bisa dieksekusi penuh (dikatakan sekarang)

1. **FR-18 — atribusi UTM lintas domain.** Sisi kirim bisa dibangun; tapi server pendaftaran terbukti membuang parameter saat redirect (catatan verifikasi di SRS, TBD-09). Yang bisa dijanjikan kode hanya: parameter ikut pada URL yang diklik. Atribusi ujung-ke-ujung ada di tangan tim pendaftaran.
2. **FR-02 AC2 — artikel terjadwal "tampil saat waktunya tiba".** Tidak ada scheduler/cron di infrastruktur (ARCHITECTURE §6, PM2 satu proses). Eksekusi realistis: kelayakan-tampil dihitung saat halaman diminta (waktu tayang ≤ sekarang). Konsekuensi: di landing yang di-cache berkala (revalidate 60 detik — ARCHITECTURE §2a), artikel muncul paling lambat ±1 menit setelah waktunya. AC terpenuhi ("tanpa tindakan admin"), tapi toleransi menit ini harus diterima. Alternatif cron ditolak di §Keputusan.
3. **FR-20** sebagian besar bukan kode melainkan verifikasi operasional di server production; direncanakan sebagai gerbang rilis dengan dokumen bukti.
4. **Empat TBD SRS memblokir detail Fase B** (TBD-02 batas upload, TBD-05 jumlah kategori per artikel, TBD-06 jadwal lampau, TBD-07 hapus kategori terpakai). Fase B punya gerbang keputusan B0; usulan default disiapkan di sana — tidak dieksekusi diam-diam.

---

# FASE A — Fondasi SEO Teknis (semua sentuhan pada permukaan existing)

## A. Urutan langkah + alasan

| # | Langkah | Alasan urutan |
|---|---|---|
| A0 | Baseline & verifikasi konfigurasi production (FR-20 dimulai) | Semua langkah A mengubah sinyal SEO; tanpa tahu kondisi awal (canonical live, isi sitemap live, GA aktif/tidak), keberhasilan tak bisa dibuktikan. Juga menutup risiko rilis-dengan-SITE_URL-salah (IMPACT §5.3) SEBELUM sinyal baru dipancarkan |
| A1 | Aset gambar OG default (FR-15) | Termudah, tanpa ketergantungan, menutup satu-satunya temuan KRITIS; bisa jalan paralel dengan A2 |
| A2 | Kontrak metadata: canonical per bahasa + hreflang (FR-16 AC1-2) | Fondasi yang dipakai SEMUA halaman — termasuk halaman artikel nanti. Harus stabil sebelum sitemap (A3) dan sebelum B |
| A3 | Sitemap: URL /en + kepastian perilaku segar (FR-16 AC3, prasyarat FR-13) | Bergantung pada logika URL per-bahasa dari A2. Sekalian menyelesaikan status UNKNOWN "sitemap beku saat build" (IMPACT §1) yang menjadi prasyarat mutlak FR-13 |
| A4 | Pipeline kompresi gambar + terapkan ke upload hero (FR-19) | Dibuat sekali di sini, dipakai ulang Fase B untuk sampul (FR-08). Ditaruh sebelum langkah CTA agar perubahan berisiko rendah selesai dulu |
| A5 | Helper analytics + 5 event existing (FR-17 sebagian) | Menyentuh komponen CTA — berisiko tinggi (IMPACT §9); dikerjakan setelah situs stabil dari A1–A4 agar verifikasi terfokus |
| A6 | UTM diteruskan ke CTA daftar (FR-18) | Menyentuh komponen yang sama dengan A5 (Hero, tombol melayang) — digabung siklus uji-nya supaya komponen paling kritis hanya diutak-atik dalam satu jendela |
| A7 | Singkatan fakultas anti-terjemahan (FR-21) | Independen; kecil; ditaruh terakhir sebelum gerbang agar gerbang menguji semuanya sekaligus |
| A8 | GERBANG FASE A: regresi penuh permukaan existing + dokumen checklist rilis | Fase B dilarang mulai sebelum gerbang ini lulus |

## A. Rincian per file

**A0 — tidak ada perubahan file kode.**
- `docs/update/v1.3.0/RILIS-CHECKLIST.md` (buat): empat butir FR-20 (canonical domain resmi; GA menerima data + ID-nya; www/http → satu host https; header cache aset) + kolom bukti. Diisi dua kali: baseline (A0) dan pra-rilis (A8/B-akhir).

**A1**
- `public/og-default.png` (buat): aset statis 1200×630, ≤300KB — alamat inilah yang sudah dipancarkan semua halaman hari ini (seo.ts:22) tapi berkasnya tidak ada. Konten visual disiapkan tim desain; ukuran/rasio adalah syarat teknis.

**A2**
- `src/lib/seo.ts` (ubah): `buildMetadata` menerima informasi locale dan path, lalu menghasilkan (a) canonical yang menunjuk URL bahasa itu sendiri — versi ID tanpa prefix, versi EN dengan prefix /en (mengikuti aturan prefix as-needed di src/i18n/routing.ts), dan (b) alternates languages (hreflang) id + en yang saling menunjuk. Perilaku title/description/OG dipertahankan persis.
- Pemanggil `buildMetadata` (ubah, meneruskan locale/path yang kini wajib): `src/app/[locale]/(public)/page.tsx`, `src/app/[locale]/(public)/pengumuman/page.tsx`, `src/app/[locale]/(public)/pengumuman/[slug]/page.tsx`, `src/app/[locale]/(public)/kontak/page.tsx`.
- `src/app/layout.tsx` (ubah kecil): pastikan metadata root tidak menimpa alternates halaman (canonical/hreflang harus dari level halaman).

**A3**
- `src/app/sitemap.ts` (ubah): (a) tiap URL statis & pengumuman dipasangkan varian /en; (b) beri konfigurasi kesegaran eksplisit (revalidasi berkala atau dinamis penuh — dipilih setelah A0 membuktikan perilaku build sekarang; keputusan dicatat di file checklist). Struktur query pengumuman existing tidak diubah.

**A4**
- `src/lib/image.ts` (buat): satu fungsi pemrosesan gambar (resize + kompresi ke batas byte/dimensi yang diminta) memakai dependency `sharp` yang SUDAH terpasang (package.json:39). Dibuat sebagai modul lib agar Fase B (sampul artikel) memakai fungsi yang sama.
- `src/app/api/admin/hero-images/upload/route.ts` (ubah): setelah validasi jenis berkas yang sudah ada, hasil unggah diproses lewat fungsi baru tersebut sebelum disimpan (target ≤300KB). Validasi tipe konten & penamaan aman existing dipertahankan.

**A5**
- `src/lib/analytics.ts` (buat): satu helper kecil "kirim event" yang aman-gagal — tidak melakukan apa pun bila GA tidak aktif, dan TIDAK PERNAH menghalangi aksi pengguna (fire-and-forget). Nama event mengikuti TBD-08 (didaftarkan di file ini sebagai satu-satunya sumber nama).
- `src/components/public/Hero.tsx` (ubah): klik CTA "Daftar Sekarang" dan "Hitung Biaya" memanggil helper — tanpa mengubah struktur href/navigasi.
- `src/components/public/DaftarFloatingButton.tsx` (ubah): sama, dengan penanda lokasi berbeda dari hero.
- `src/components/public/WhatsAppFloatingButton.tsx` (ubah): event klik WA.
- `src/components/public/DokumenList.tsx` (ubah): event unduh dokumen (dengan identitas dokumen).
- `src/components/public/KalkulatorForm.tsx` (ubah): event saat perhitungan dijalankan.

**A6**
- `src/components/public/Hero.tsx` + `src/components/public/DaftarFloatingButton.tsx` (ubah, bersamaan dengan A5): saat diklik, parameter `utm_*` yang ada di alamat halaman saat itu ditambahkan ke URL pendaftaran tujuan. Wajib dikerjakan di sisi klien saat klik — landing di-cache bersama (ISR 60 detik), sehingga HTML server tidak boleh memuat parameter per-pengunjung. href dasar tidak diubah; parameter hanya ditambahkan bila ada, dengan encoding benar.

**A7**
- `src/components/public/FakultasProdiSection.tsx` (ubah): tiga titik render singkatan (baris 205, 235, 287) dibungkus elemen singkatan ber-atribut anti-terjemahan + judul berisi nama lengkap (data `nama` fakultas/prodi sudah tersedia di props komponen). Tanpa perubahan kelas visual.

**A8 — tidak ada perubahan file** (eksekusi checklist + regresi).

## A. Migrasi database

Tidak ada. Fase A tidak menyentuh skema maupun data. Downtime: tidak ada — semua perubahan ter-deploy sebagai rilis aplikasi biasa.

## A. Titik verifikasi

| Setelah | Tes |
|---|---|
| A0 | Baseline terdokumentasi: view-source canonical live; isi /sitemap.xml live; uji "sitemap beku/tidak": terbitkan satu pengumuman uji → cek muncul/tidaknya di sitemap production tanpa rebuild; status GA (Realtime menerima kunjungan atau tidak) |
| A1 | Alamat og-image dibuka langsung → gambar tampil (bukan 404); tempel URL beranda ke WhatsApp → pratinjau bergambar |
| A2 | View-source 8 kombinasi (4 halaman × 2 bahasa): hreflang id/en saling menunjuk, canonical self-per-bahasa; REGRESI: title/description/OG tiap halaman tidak berubah dari baseline A0 |
| A3 | /sitemap.xml memuat URL /en; pengumuman uji baru muncul di sitemap dalam jendela yang ditetapkan; pengumuman existing tetap lengkap |
| A4 | Upload hero baru 2MB → berkas tersaji ≤300KB; slider beranda tetap normal; upload hero LAMA yang sudah ada tidak tersentuh |
| A5 | GA Realtime/DebugView: 5 event masuk, lokasi CTA hero vs melayang terbedakan; KRITIS: navigasi tetap jalan bila GA diblokir ad-blocker / GA nonaktif (klik tanpa event ≠ klik gagal) |
| A6 | Buka landing dengan ?utm_source=uji → klik kedua CTA → URL tujuan memuat parameter; TANPA utm → URL tujuan bersih seperti sekarang; klik tetap membuka pendaftaran dalam segala kondisi |
| A7 | Chrome auto-translate ID→EN: FEB tetap FEB; hover/pembaca layar menampilkan nama lengkap; screenshot sebelum-sesudah identik |
| A8 (gerbang) | Seluruh daftar regresi IMPACT.md §8 butir 1–17 pada permukaan existing + RILIS-CHECKLIST terisi. Lulus = Fase B boleh mulai |

## A. Ketergantungan antar langkah

- A2 → A3 (sitemap memakai logika URL per-bahasa yang sama).
- A0 → A3 (pilihan mekanisme kesegaran sitemap ditentukan hasil uji A0).
- A5 → A6 (komponen sama; dikerjakan dalam satu perubahan agar satu siklus uji).
- A1, A4, A7 independen — boleh paralel.
- A8 menunggu semuanya.

## A. Langkah paling berisiko + mitigasi

**A5+A6 (Hero & tombol daftar melayang)** — satu-satunya jalur konversi bisnis, diubah saat gelombang aktif (IMPACT §9). Mitigasi: (1) href asli tidak pernah diganti — event dan parameter bersifat tambahan; (2) helper analytics fire-and-forget, error-nya ditelan, tak pernah preventDefault; (3) diuji dengan GA mati, GA diblokir, dan tanpa utm — tiga kondisi "normal hari ini" harus identik perilakunya; (4) rilis A5/A6 dipisah commit-nya dari langkah lain agar rollback = revert dua komponen; (5) uji manual di ponsel sungguhan sebelum dan sesudah deploy pada hari yang sama.

---

# FASE B — Modul Artikel (aditif; menyentuh existing hanya di 4 titik yang disebut)

## B. Urutan langkah + alasan

| # | Langkah | Alasan urutan |
|---|---|---|
| B0 | Gerbang keputusan TBD (02, 05, 06, 07) | Bentuk kolom kategori (TBD-05) menentukan skema; batas upload (TBD-02) menentukan validasi; tanpa ini B1 tidak boleh mulai |
| B1 | Skema data: model Artikel & KategoriArtikel | Semua langkah lain membaca/menulis lewat model ini |
| B2 | Pendaftaran menu & RBAC | Harus ada SEBELUM route API/halaman admin dipakai — celah "rute tak dikenal = diizinkan" (IMPACT §7.6) menuntut peta akses terpasang duluan |
| B3 | Route API admin (artikel, kategori, upload sampul) | Butuh B1 (model), B2 (peta akses), A4 (pipeline gambar) |
| B4 | Halaman admin (daftar, form, kategori) + penyesuaian editor | Butuh B3; di sinilah satu-satunya perubahan komponen bersama Fase B (RichTextEditor) terjadi |
| B5 | Halaman publik: indeks + detail | Butuh B1 + kontrak metadata A2; dibangun sebelum landing agar komponen kartu lahir di sini lalu dipakai ulang |
| B6 | Section 3 kartu di landing | Menyentuh halaman paling kritis — dikerjakan setelah kartu & query teruji di B5 |
| B7 | Artikel di sitemap | Butuh B1 + mekanisme A3 |
| B8 | Event analytics artikel (event ke-6) | Butuh B5/B6 + helper A5 |
| B9 | Gerbang FASE B: uji fungsional artikel + regresi ulang permukaan yang disentuh (landing, pengumuman, sitemap) | Penutup |

(B9 mencakup pengisian ulang RILIS-CHECKLIST sebagai syarat rilis final — FR-20.)

## B. Rincian per file

**B0 — tidak ada file kode.** Keputusan dicatat sebagai revisi kecil SRS §11. Usulan default yang diajukan untuk diputuskan (bukan dieksekusi diam-diam): TBD-02 = pakai batas unggah existing di konfigurasi lingkungan; TBD-05 = satu kategori per artikel (kolom tunggal — paling sederhana, bisa dilonggarkan nanti tanpa migrasi destruktif; kebalikannya tidak); TBD-06 = jadwal berwaktu lampau ditolak form dengan pesan; TBD-07 = kategori yang masih dipakai tidak bisa dihapus (blokir dengan pesan).

**B1**
- `src/models/Artikel.ts` (buat): field, tipe, default, dan index persis SRS §5 (judul/_en, slug unik terkunci, isi/_en, coverImage, status 4 nilai, publishedAt, pinned, kategori_id, tags, metaTitle/metaDescription/ogImage, createdBy/updatedBy, deletedAt/deletedBy) — pola file mengikuti konvensi AGENTS.md (satu model per file, timestamps, tanpa versionKey). Ditambah: satu fungsi kondisi "layak tampil publik" (terbit-atau-terjadwal-yang-sudah-waktunya, belum terhapus) yang WAJIB dipakai semua pembaca publik — mitigasi kebocoran draft (IMPACT §7.4).
- `src/models/KategoriArtikel.ts` (buat): nama/_en, slug unik, createdBy/updatedBy.

**B2**
- `src/lib/permissions.ts` (ubah): entri menu Artikel dan Kategori Artikel di ADMIN_NAV TANPA pembatasan roles (SRS §6: semua peran). Catatan penting: keduanya TIDAK boleh diletakkan di grup "Master Data" karena grup itu terkunci admin+ (permissions.ts:12-36) — jadi entri berdiri sendiri. Peta akses API otomatis mengikuti pola pemetaan existing; diverifikasi eksplisit di titik verifikasi B2.

**B3**
- `src/app/api/admin/artikel/route.ts` (buat): daftar + buat — konvensi penuh AGENTS.md (runtime nodejs, guard requireAdmin minRole editor, connectDb, validasi Zod → 400 `{error, details}`, respons `{item/items}`, writeAuditLog).
- `src/app/api/admin/artikel/[id]/route.ts` (buat): detail + ubah + hapus. Dua penyimpangan sadar dari pola modul existing, keduanya diperintahkan SRS: (a) **cek kepemilikan** — editor hanya boleh menyentuh miliknya (bandingkan createdBy dengan sesi; admin+ lolos) — pola baru, belum ada preseden, alasannya SRS §6; (b) **hapus = tandai deletedAt**, bukan hapus dokumen — alasannya FR-14.
- `src/app/api/admin/artikel/[id]/restore/route.ts` (buat): pulihkan (hapus tanda deletedAt), dengan aturan kepemilikan yang sama.
- `src/app/api/admin/artikel/upload-sampul/route.ts` (buat): unggah sampul → validasi jenis konten (pola existing file-type) → proses lewat `src/lib/image.ts` (A4) ke 16:9/≤1200px/≤300KB (FR-08).
- `src/app/api/admin/kategori-artikel/route.ts` + `[id]/route.ts` (buat): CRUD kategori, minRole editor, dengan aturan TBD-07 yang diputuskan di B0.

**B4**
- `src/app/admin/artikel/page.tsx` (buat): daftar (termasuk tab/saringan status & daftar terhapus sesuai matriks §6), memakai komponen bersama existing apa adanya (PageHeader, Field, TableLoadingRow, SearchableSelect — tanpa mengubah satu pun dari mereka).
- `src/app/admin/artikel/tambah/page.tsx`, `src/app/admin/artikel/[id]/edit/page.tsx`, `src/app/admin/artikel/_form/ArtikelForm.tsx` (buat): meniru pola halaman-penuh pengumuman (UI-CURRENT §2).
- `src/app/admin/kategori-artikel/page.tsx` (buat): CRUD modal sederhana pola FAQ.
- `src/components/admin/RichTextEditor.tsx` (ubah — SATU-SATUNYA komponen bersama yang diubah di Fase B): tambah opsi konfigurasi untuk menonaktifkan kemampuan gambar, dengan **default = perilaku sekarang** sehingga PengumumanForm tidak berubah sedikit pun; ArtikelForm memakai opsi nonaktif-gambar (FR-08: isi tanpa gambar). Penonaktifan harus di level kemampuan editor (termasuk tempel/seret gambar), bukan sekadar menyembunyikan tombol.

**B5**
- `src/components/public/ArtikelCard.tsx` (buat): kartu 5 unsur (foto, judul, ringkasan, penulis, tanggal) — dipakai indeks DAN landing agar tampilan konsisten dan diuji sekali.
- `src/app/[locale]/(public)/artikel/page.tsx` (buat): indeks SSR — 9 per halaman, saringan kategori & tag, pencarian judul. Pencarian: input dipangkas panjangnya dan di-escape memakai util escape existing (pola escapeRegex yang sudah ada di lib) — mitigasi regex-DoS (IMPACT §7.3). Ringkasan kartu: diturunkan dari isi dengan util strip-HTML existing di lib seo — bukan disimpan (FR-07).
- `src/app/[locale]/(public)/artikel/[slug]/page.tsx` (buat): detail SSR — sanitasi isi dengan util sanitasi existing (pola halaman pengumuman), metadata via buildMetadata hasil A2 (fallback FR-12), JSON-LD jenis artikel + breadcrumb inline (pola JsonLd existing), fallback _en. Nama penulis dibaca dengan **seleksi field ketat hanya nama** — mitigasi kebocoran email/role admin (IMPACT §7.1). Status tak-layak-tampil → halaman tidak-ditemukan standar (SRS §7.5).
**B6**
- `src/components/public/ArtikelSection.tsx` (buat): section beranda — 3 kartu, unggulan dulu (FR-09), memakai ArtikelCard.
- `src/app/[locale]/(public)/page.tsx` (ubah — titik paling hati-hati): tambah satu query artikel (lewat fungsi layak-tampil B1, dengan catch fail-soft mengikuti pola query landing existing page.tsx:70-77) + render ArtikelSection. Tidak menyentuh section lain.

**B7**
- `src/app/sitemap.ts` (ubah): tambah URL artikel layak-tampil (fungsi B1), ikut varian /en, mengikuti mekanisme kesegaran A3.

**B8**
- `src/components/public/ArtikelCard.tsx` (ubah kecil): klik kartu memanggil helper analytics A5 (event ke-6, FR-17).

**B9 — tidak ada file baru**; pengisian final `docs/update/v1.3.0/RILIS-CHECKLIST.md`.

- `messages/id.json` + `messages/en.json` (ubah, bagian dari B5/B6): kunci teks section & halaman artikel — dua file SELALU diubah bersamaan (kunci hilang = error render next-intl, IMPACT §1).

## B. Migrasi database

- Proyek tidak punya kerangka migrasi (hanya seed — ARCHITECTURE; scripts/seed.ts). MongoDB + Mongoose: koleksi dan index dibuat otomatis saat model pertama kali dipakai.
- **Maju:** deploy aplikasi → koleksi `Artikel` & `KategoriArtikel` terbentuk sendiri saat tulisan pertama; index (slug unik ×2, status+publishedAt, pinned, tags, deletedAt, kategori_id) dibuat Mongoose saat inisialisasi model. Verifikasi index dilakukan manual lewat shell Mongo (`getIndexes`) di titik verifikasi B1.
- **Mundur:** hapus kedua koleksi (drop) + revert kode. Tidak ada jejak lain.
- **Data existing:** tidak tersentuh sama sekali — nol perubahan pada 15 koleksi yang ada (SRS §5, IMPACT §3).
- **Downtime:** tidak ada. Pembuatan koleksi/index kosong berlangsung milidetik; deploy = restart proses PM2 seperti rilis biasa.
- Urutan: B1 harus ter-deploy (atau setidaknya tervalidasi di lingkungan dev dengan DB uji) sebelum B3 diuji; tidak ada migrasi data antar langkah.

## B. Titik verifikasi

| Setelah | Tes |
|---|---|
| B1 | Di lingkungan dev: simpan-baca dokumen artikel percobaan; `getIndexes` menunjukkan semua index; slug duplikat ditolak unik-index; fungsi layak-tampil menyaring draft/terjadwal-belum-waktunya/arsip/terhapus dengan benar (uji keempat status) |
| B2 | Login editor: menu Artikel & Kategori terlihat; menu Master Data tetap tersembunyi bagi editor; akses langsung URL admin artikel oleh anonim → redirect login (bukan lolos "unknown route") |
| B3 | CRUD via API: buat-ubah-hapus-pulihkan; editor A vs artikel milik B → ditolak; admin → lolos; hapus = dokumen masih ada ber-deletedAt; audit log tercatat; upload sampul: JPG 4000×3000 → tersimpan 16:9 ≤300KB; PDF menyamar .jpg → ditolak |
| B4 | Alur admin lengkap di browser: draft → jadwal → terbit → arsip → hapus → pulihkan; REGRESI KRITIS: form Pengumuman masih bisa menyisipkan gambar lewat editor (default prop tidak mengubah perilaku) |
| B5 | Indeks: 20 artikel → 9/halaman, saringan kategori/tag, pencarian (termasuk input simbol aneh → tidak error); detail: view-source memuat isi, meta fallback & manual, JSON-LD lolos uji Rich Results; nama penulis tampil, dan view-source TIDAK memuat email/role penulis; slug artikel terhapus → halaman tidak-ditemukan |
| B6 | Landing: 3 kartu, unggulan pertama; SEMUA section lain utuh (hero, jadwal, kalkulator, fakultas, FAQ, Instagram, popup); matikan sementara data artikel (kosongkan) → landing tetap hidup tanpa section rusak |
| B7 | Terbitkan artikel → muncul di sitemap dalam jendela A3; arsipkan → hilang; URL /en artikel ikut |
| B8 | GA Realtime: klik kartu artikel tercatat sebagai event ke-6 |
| B9 (gerbang rilis) | Regresi permukaan tersentuh: landing penuh, pengumuman (daftar/detail/buat-dengan-gambar), sitemap, CTA daftar + utm, WhatsApp; ponsel + desktop; RILIS-CHECKLIST empat butir lulus dengan bukti |

## B. Ketergantungan antar langkah

- B0 → B1 (skema menunggu TBD-05); B1 → B3, B5, B6, B7; B2 → B3/B4 (akses harus terpeta sebelum rute hidup); A4 → B3 (pipeline sampul); A2 → B5 (metadata); A3 → B7 (mekanisme sitemap); A5 → B8 (helper event); B5 → B6 (ArtikelCard lahir di B5); B3 → B4 (halaman admin memakai API).
- Gerbang A8 → seluruh Fase B.

## B. Langkah paling berisiko + mitigasi

**B6 (menyunting landing page)** — halaman bisnis utama dengan 11 query paralel; satu error menjatuhkan semuanya (IMPACT §1). Mitigasi: (1) query artikel dibungkus fail-soft mengikuti pola catch existing halaman itu — data kosong/DB gagal = section tak tampil, halaman tetap hidup; (2) section dirender dari komponen yang SUDAH teruji di B5; (3) perubahan diisolasi satu commit; (4) uji "artikel nol", "hanya 1-2 artikel", "unggulan lebih dari satu" sebelum deploy.

**Runner-up: B4 (prop baru RichTextEditor)** — komponen dipakai Pengumuman (IMPACT §2). Mitigasi: default prop = perilaku sekarang; uji regresi eksplisit sisip-gambar pengumuman sebelum dan sesudah; penonaktifan di level kemampuan editor supaya tempel/seret ikut mati (bukan kosmetik).

---

# KEPUTUSAN TEKNIS (dengan alternatif yang ditolak)

1. **Visibilitas terjadwal dihitung saat baca (query-time), bukan scheduler.** Ditolak: cron/job scheduler — infrastruktur tidak punya (PM2 fork tunggal, ARCHITECTURE §6), menambah komponen operasional baru saat gelombang aktif; ditolak juga: timer dalam proses (hilang saat restart, tidak andal).
2. **hreflang/canonical lewat perluasan `buildMetadata` tunggal.** Ditolak: menulis alternates manual per halaman — empat halaman × dua bahasa = delapan titik yang bisa saling tak sinkron; helper tunggal sudah menjadi pola existing (seo.ts).
3. **Kompresi gambar server-side dengan `sharp` yang sudah terpasang, di modul lib baru `src/lib/image.ts`.** Ditolak: kompresi sisi klien (bisa dilewati, hasil tak terjamin); ditolak: menulis logika di dalam route hero (tidak terpakai ulang untuk sampul B3); ditolak: menaruh di fileStorage.ts (mencampur urusan disk dengan transformasi gambar).
4. **Event analytics via helper `src/lib/analytics.ts` + gtag existing.** Ditolak: memasang Google Tag Manager — sistem eksternal baru, butuh perubahan CSP dan pihak ketiga, padahal gtag sudah terpasang di root layout; ditolak: panggilan gtag tersebar mentah di tiap komponen (tidak ada satu tempat untuk daftar nama event/TBD-08 dan guard).
5. **UTM ditambahkan di sisi klien saat klik.** Ditolak: merender parameter di HTML server — landing di-cache ISR 60 detik untuk SEMUA pengunjung, parameter per-pengunjung akan bocor antar pengunjung atau memaksa mematikan cache landing (dampak performa).
6. **Soft delete = kolom penanda di koleksi yang sama.** Ditolak: koleksi "sampah" terpisah (memindahkan dokumen merusak jaminan slug-unik-selamanya yang dibutuhkan SRS §7.2, dan menggandakan logika); ditolak: plugin soft-delete pihak ketiga (dependency baru untuk kebutuhan satu kolom + satu filter).
7. **Larangan gambar isi artikel via opsi konfigurasi RichTextEditor (default = perilaku lama).** Ditolak: menduplikasi komponen editor (dua versi yang akan saling menjauh); ditolak: menyembunyikan tombol lewat tampilan saja (kemampuan tetap aktif lewat tempel/seret — lubang kebutuhan FR-08).
8. **Ringkasan diturunkan saat render dari isi (strip-HTML existing).** Ditolak: menyimpan ringkasan di dokumen (SRS FR-07 menyatakan tidak ada field; juga membuka masalah basi saat isi diedit).
9. **Nama penulis dibaca dengan seleksi field ketat (hanya nama).** Ditolak: populate penuh AdminUser (menyeret email/role ke proses render publik — IMPACT §7.1); ditolak: menyalin nama penulis ke dokumen artikel (data ganda; SRS §7.4 tetap terpenuhi dengan relasi + seleksi karena akun nonaktif tidak dihapus relasinya).
10. **Kategori & menu artikel sebagai entri ADMIN_NAV mandiri tanpa batasan roles.** Ditolak: menumpang grup Master Data (grup itu admin+; SRS §6 menuntut editor bisa kelola kategori).
11. **Pencarian judul dengan escape + batas panjang input, tanpa index teks khusus.** Ditolak: full-text index Mongo (kebutuhan hanya judul, volume kecil; index teks menambah kompleksitas tanpa kebutuhan SRS); ditolak: layanan pencarian eksternal (jelas berlebihan).

# USULAN DEPENDENCY

**Tidak ada.** Seluruh rencana dieksekusi dengan dependency yang sudah terpasang: sharp (resize/kompresi), slugify (slug), zod (validasi), sanitize-html via lib existing (sanitasi isi), Tiptap existing (editor), gtag script existing (analytics), next-intl existing (locale/hreflang). Godaan dependency yang saya tolak dicatat di Keputusan Teknis #4, #6, #11 — jika saat implementasi ternyata ada kebutuhan library baru, itu harus kembali ke Anda sebagai usulan terpisah sebelum dipasang (sesuai aturan AGENTS.md: dilarang menambah dependency tanpa persetujuan eksplisit).
