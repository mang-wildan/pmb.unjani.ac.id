# Analisis Dampak v1.3.0 — Apa yang Bisa Rusak

Basis: docs/update/v1.3.0/SRS.md (FR-01…FR-21), SEO-AUDIT.md, docs/ARCHITECTURE.md, docs/DATA-MODEL.md, docs/UI-CURRENT.md. Dokumen ini memetakan risiko, bukan solusi. Konteks yang memperberat semua risiko di bawah: **proyek tidak punya test otomatis sama sekali** (script test tidak ada — AGENTS.md "Test: UNKNOWN", package.json:9-16) dan **rilis dilakukan di tengah gelombang pendaftaran aktif** (SRS §8).

## 1. File & Modul Tersentuh (per FR)

Modul artikel sebagian besar berupa file BARU (model, halaman admin, halaman publik, route API — risiko regresi rendah pada dirinya sendiri). Yang berbahaya adalah file EXISTING yang harus ikut diubah:

| FR | File existing yang HARUS diubah | Kenapa |
|---|---|---|
| FR-09 (kartu landing) | src/app/[locale]/(public)/page.tsx | Landing = halaman bisnis paling kritis; sudah meng-query 11 model sekaligus (page.tsx:3-17,70-80). Satu error query artikel = landing mati total, bukan cuma section-nya |
| FR-01…05, kategori | src/lib/permissions.ts (ADMIN_NAV + peta RBAC) | Menu admin & izin per path diturunkan dari ADMIN_NAV (permissions.ts:12-36); proxy memakai `canAccessPage`/`canAccessApi` untuk SEMUA rute admin (src/proxy.ts:120-122). Salah edit = admin terkunci atau rute baru lolos tanpa RBAC |
| FR-01 (editor isi) | src/components/admin/RichTextEditor.tsx ATAU pemakaiannya | Editor ini punya fitur sisip gambar bawaan (RichTextEditor.tsx:7,118,178-200) sedangkan artikel dilarang gambar dalam isi (FR-08). Lihat §2 — konsumen lain: PengumumanForm |
| FR-13, FR-16 | src/app/sitemap.ts | Tambah URL artikel + URL /en (sitemap.ts:6-30) |
| FR-15, FR-16 | src/lib/seo.ts (+ file og-default baru di public/) | `buildMetadata` dipakai SEMUA halaman publik untuk title/canonical/OG (seo.ts:12-45). Bug di sini merusak metadata seluruh situs sekaligus |
| FR-16 | Semua pemanggil buildMetadata + root layout | Canonical & hreflang per bahasa menyentuh: landing (page.tsx:41-48), pengumuman/[slug] (page.tsx:15-34), /pengumuman, /kontak, src/app/layout.tsx:23-49 |
| FR-17 (event) | Hero.tsx, DaftarFloatingButton.tsx, WhatsAppFloatingButton.tsx, DokumenList.tsx, KalkulatorForm.tsx | Kelima komponen ini adalah jalur konversi yang sedang hidup (Hero.tsx:59-75; DaftarFloatingButton.tsx:22-33) |
| FR-18 (UTM) | Hero.tsx + DaftarFloatingButton.tsx (+ jalur pengiriman URL dari layout, src/app/[locale]/(public)/layout.tsx:45) | Mengubah cara href CTA pendaftaran dibentuk — link bisnis paling penting di situs |
| FR-19 | src/app/api/admin/hero-images/upload/route.ts | Pipeline upload hero EXISTING ikut diubah (kompresi otomatis), bukan hanya pipeline baru |
| FR-21 | src/components/public/FakultasProdiSection.tsx:205,235,287 | Tiga titik render singkatan |
| FR-02, i18n semua FR-A | messages/id.json, messages/en.json | Kunci terjemahan baru; kunci hilang = error render next-intl |

Terpengaruh tidak langsung (tidak diedit, tapi perilakunya bisa berubah): src/components/admin/Sidebar.tsx (merender ADMIN_NAV, Sidebar dipakai AdminShell → semua halaman admin — UI-CURRENT §3); src/proxy.ts (rute /artikel & /api/admin/artikel* baru lewat matcher & cabang CSRF/RBAC yang sama, proxy.ts:94-148); src/lib/db.ts (beban query baru); AuditLog (entitas baru).

Dua jebakan spesifik yang tidak terlihat dari daftar file:

- **FR-02 AC2 (terjadwal tampil otomatis) vs ISR landing.** Tidak ada scheduler/cron di sistem (ARCHITECTURE §6). Landing di-cache `revalidate = 60` (page.tsx:39). Artikel terjadwal baru terlihat setelah jendela revalidasi — uji penerimaan yang dijalankan tepat pada waktunya bisa gagal, dan "tanpa tindakan admin" bergantung sepenuhnya pada mekanisme berbasis waktu-query, bukan event.
- **FR-13 (sitemap otomatis).** src/app/sitemap.ts TIDAK punya opsi `revalidate`/`dynamic` (grep nihil). Apakah di build production sitemap dibekukan saat build atau di-query per permintaan: UNKNOWN — perlu verifikasi. Jika beku, "otomatis masuk sitemap" tidak akan terjadi tanpa perubahan perilaku file ini — dan itu juga berarti perilaku sitemap pengumuman existing ikut berubah.

## 2. Komponen UI Bersama (penyebab regresi paling sering)

Komponen yang DIUBAH dan seluruh pemakainya (rujukan lengkap: docs/UI-CURRENT.md §3):

| Komponen diubah | Dipakai di (SEMUA harus diuji ulang) |
|---|---|
| DaftarFloatingButton (FR-17, FR-18) | Layout publik → SEMUA halaman publik: landing, /pengumuman, /pengumuman/[slug], /kontak, + 3 halaman artikel baru ((public)/layout.tsx:45) |
| WhatsAppFloatingButton (FR-17) | Layout publik → semua halaman publik yang sama ((public)/layout.tsx:46) |
| Hero (FR-17, FR-18) | Landing; Hero membungkus HeroSlider + HeroGelombangInfo — kerusakan merembet ke keduanya |
| DokumenList (FR-17) | Landing |
| KalkulatorForm (FR-17) | Landing; di dalamnya ada SearchableSelect & Card |
| FakultasProdiSection (FR-21) | Landing; komponen ini juga memakai Reveal dan Card |
| RichTextEditor (FR-01/FR-08) | **PengumumanForm** (satu-satunya pemakai sekarang — UI-CURRENT §3). Jika larangan gambar-dalam-isi artikel diterapkan dengan mengubah komponen ini, form Pengumuman KEHILANGAN fitur sisip gambar yang hari ini dipakai (RichTextEditor.tsx:178-200 → /api/admin/upload-image). Ini regresi fungsional nyata, bukan teoretis |
| seo.ts / buildMetadata (FR-15, FR-16) | Bukan komponen UI tapi kontrak bersama: landing, /pengumuman, /pengumuman/[slug], /kontak — semua metadata halaman publik lewat satu fungsi ini |

Komponen yang DIPAKAI modul baru tanpa niat diubah — tapi godaan "sekalian rapikan" harus dianggap perubahan berdampak luas: Field (16 file admin + SearchableSelect), PageHeader (16 file), ModalShell (13 file), TableLoadingRow (12 file), SearchableSelect (9 halaman admin + landing + KalkulatorForm), Card/SectionHeading (3 halaman publik + 6 komponen publik). Mengubah satu dari ini = menguji ulang belasan halaman (daftar persis di UI-CURRENT §3).

## 3. Perubahan Skema Database

| Perubahan | Destruktif? | Reversible? | Nasib data existing | Downtime? |
|---|---|---|---|---|
| Koleksi baru `Artikel` + index (slug unique, {status, publishedAt}, pinned, tags, deletedAt) | Tidak | Ya (drop koleksi) | Tidak tersentuh | Tidak (koleksi kosong, index instan) |
| Koleksi baru `KategoriArtikel` + slug unique | Tidak | Ya | Tidak tersentuh | Tidak |
| Koleksi existing | — | — | SRS §5 menegaskan TIDAK ada perubahan skema existing | — |

Ini satu-satunya area berisiko RENDAH secara struktural. Dua catatan non-skema:

- FR-06 membuat halaman publik untuk pertama kalinya MEMBACA koleksi `AdminUser` (nama penulis). Tidak ada halaman publik yang melakukan itu hari ini (grep `populate` di halaman publik hanya menyentuh Jadwal/ProgramStudi dengan seleksi field — page.tsx:104-146). Risiko bukan pada skema tapi pada apa yang ikut terserialisasi (lihat §7).
- Soft delete (`deletedAt`) adalah pola BARU — tidak ada satu pun modul existing yang memakainya (semua DELETE permanen, ARCHITECTURE §3). Artinya tidak ada kebiasaan/kode teruji untuk "selalu saring yang terhapus"; setiap query artikel yang lupa menyaring adalah kebocoran (lihat §7).

## 4. Dampak pada Rendering & Routing

- URL existing: TIDAK ada yang berubah. Rute baru (`/artikel`, `/artikel/[slug]`, `/admin/artikel*`, `/api/admin/artikel*`) tidak menabrak rute existing (daftar lengkap route di ARCHITECTURE §3). **Tidak ada redirect 301 baru yang dibutuhkan untuk halaman existing.**
- Mode render tidak berubah untuk halaman existing; halaman artikel wajib SSR (SRS FR-11) — konsisten pola pengumuman.
- Yang berubah adalah SINYAL pada URL yang sudah terindeks: canonical semua halaman `/en/*` berpindah dari "menunjuk versi ID" menjadi "menunjuk dirinya sendiri" + hreflang baru + URL /en masuk sitemap (FR-16; kondisi sekarang: SEO-AUDIT SEO-02, seo.ts:21,27). Google akan mengevaluasi ulang seluruh pasangan halaman ID/EN. Ini perubahan perilaku indeks, bukan perubahan URL — tapi efeknya lintas SEMUA halaman publik sekaligus.
- proxy.ts memproses SEMUA path (matcher proxy.ts:10-12): rute publik artikel akan melewati cabang intlMiddleware, rute admin artikel melewati cabang auth+CSRF+RBAC. Tidak perlu edit matcher, tapi peta `canAccessApi` harus mengenali API baru — jika tidak, perilakunya mengikuti aturan "unknown" yang sekarang (permissions.ts: rute tak dikenal → allow) — artinya rute admin artikel bisa TERBUKA untuk semua peran secara diam-diam.

## 5. Dampak SEO yang Tidak Bisa Dibalik

Ditandai eksplisit — urutan dari paling permanen:

1. **[IREVERSIBEL PRAKTIS] Peluncuran canonical/hreflang EN (FR-16).** Begitu Google mengindeks halaman `/en/*` sebagai entitas mandiri, menariknya kembali (kembali ke kondisi sekarang) meninggalkan URL EN terindeks yang harus di-de-index perlahan. Keputusan "EN ditarget penuh" praktis satu arah.
2. **[IREVERSIBEL] URL artikel yang telanjur terindeks lalu dihapus/diarsipkan.** Halaman menjadi 404/410 di hasil pencarian sampai Google membuangnya — reputasi hasil pencarian tidak bisa "di-undo". Slug terkunci (FR-03) dan pemulihan menghidupkan URL yang sama (SRS §7.5) memperkecil, bukan menghilangkan, risiko ini.
3. **[IREVERSIBEL JIKA TERJADI] Rilis dengan `NEXT_PUBLIC_SITE_URL` salah (TBD-04/FR-20).** Canonical/sitemap/OG seluruh situs — termasuk semua URL artikel & /en baru — akan mengumumkan domain salah (fallback `http://localhost:3000`, seo.ts:3-6) ke mesin pencari. Membersihkannya perlu berminggu-minggu re-crawl. Ini sudah ditandai KRITIS-untuk-diverifikasi di audit (SEO-13) dan belum terverifikasi sampai sekarang.
4. **[PERMANEN SEJAK v1.2.0, jangan diperparah]** 5 halaman lama sudah `permanentRedirect` 308 ke `/` (UI-CURRENT §2) — browser & Google meng-cache-nya permanen. Path `/biaya-pendidikan`, `/jadwal`, `/jalur-seleksi`, `/kalkulator`, `/manual-book` tidak boleh dipakai ulang untuk konten artikel.
5. Reversible (untuk kontras): perbaikan og:image (FR-15), event analytics (FR-17), UTM (FR-18), kompresi upload (FR-19) — bisa dicabut tanpa jejak indeks.

## 6. Konsumen Eksternal

- **Tidak ditemukan bukti konsumen API eksternal di kode** (tidak ada dokumentasi kontrak, tidak ada CORS longgar; CSP `connect-src` hanya untuk layanan keluar — next.config.mjs). Aplikasi mobile / sistem kampus lain yang mengonsumsi endpoint publik (`/api/files/[id]`, `/api/popup-image/[id]`, `/api/program-studi/[id]/akreditasi` — ARCHITECTURE §3): **UNKNOWN — perlu konfirmasi manual.** SRS tidak mengubah endpoint existing mana pun, jadi breaking change by design: tidak ada.
- Integrasi keluar: reCAPTCHA & Instagram tidak tersentuh (ARCHITECTURE §5). **Satu kontrak keluar BERUBAH: URL menuju `pendaftaran.unjani.ac.id` akan membawa parameter utm_* (FR-18).** SUDAH DIUJI 6 Agustus 2026 (fetch HTTP + browser manual): halaman login TERBUKA NORMAL dengan `?utm_*` — tombol daftar tidak akan rusak. NAMUN server mereka me-redirect ke URL bersih dan MEMBUANG parameternya (`/loginnew?utm_source=uji...` → `/loginnew`), sehingga atribusi via URL tidak pernah sampai ke halaman final. Parameter hanya terlihat servernya pada request pertama. Konsekuensi: AC FR-18 versi sekarang kemungkinan tidak bisa lulus; kebutuhan atribusi harus dirumuskan ulang bersama tim pendaftaran (apakah access log mereka mencatat query string, atau redirect bisa mempertahankan parameter) — SRS TBD-09.
- GA4: event baru bersifat aditif — tidak merusak pelaporan existing (yang memang hampir kosong, SEO-AUDIT E).

## 7. Risiko Keamanan

1. **Nama admin tampil publik pertama kalinya (FR-06).** Serialisasi penulis yang tidak diseleksi ketat bisa ikut membawa `email`, `role`, `lastLoginAt` dari AdminUser ke HTML publik (field ada di DATA-MODEL §1; hanya `passwordHash` yang `select:false`). Ini kebocoran data pegawai + amunisi phishing/penargetan akun admin. Halaman publik existing belum pernah menyentuh AdminUser — tidak ada pola aman yang tinggal ditiru.
2. **Ringkasan otomatis dari HTML (FR-07).** Potongan isi artikel dirender di landing — halaman paling ramai. Pemotongan HTML yang salah (tag terpotong, atribut lolos) = XSS atau layout pecah di landing. Pembanding existing hanya `stripHtml` untuk meta description (seo.ts dipakai [slug]/page.tsx:31), belum pernah untuk konten kartu.
3. **Input pencarian publik pertama (FR-10).** Belum ada satu pun input pengguna anonim yang menyentuh DB hari ini (grep searchParams di halaman publik nihil). Pencarian judul membuka: injeksi operator query, regex-DoS (helper `escapeRegex` yang ada hanya dipakai modul admin — src/lib/activityLog.ts:64), dan beban query tanpa throttling — `rateLimit` hanya terpasang di login (grep: src/app/api/auth/login/route.ts satu-satunya).
4. **Kebocoran artikel non-publik.** Draft/terjadwal/arsip/terhapap-soft harus disaring di ≥6 permukaan terpisah: landing, indeks, detail, pencarian, filter kategori/tag, sitemap. Satu yang lolos = draft bocor via tebakan slug. Pola soft delete belum ada presedennya di kode (§3).
5. **Pipeline gambar (FR-08, FR-19).** Decoding + resize gambar server-side atas file kiriman admin = permukaan klasik (image bomb, file menyamar). Validasi jenis-konten sudah jadi pola existing (dependency file-type, package.json:28) tapi langkah RESIZE-nya baru. Endpoint upload juga tanpa rate limit.
6. **Celah RBAC diam-diam.** `canAccessPage` mengembalikan `true` untuk rute tak dikenal (permissions.ts, komentar "unknown route -> allow"). Lupa mendaftarkan rute artikel di ADMIN_NAV/peta API = semua peran bisa mengakses, tanpa error apa pun yang memberi tahu (lihat §4).
7. **Data pribadi pendaftar: tidak tersentuh** — tetap tidak ada di sistem ini (DATA-MODEL §Data Pribadi); FR-18 hanya menambah parameter kampanye, bukan data pribadi, pada URL keluar.

## 8. Regression Test Wajib (dijalankan manusia, sebelum & sesudah rilis)

Alur pendaftaran — PALING KRITIS, uji di desktop dan ponsel sungguhan:

1. Buka landing → klik "Daftar Sekarang" di hero → tab baru terbuka dan halaman login `pendaftaran.unjani.ac.id` tampil penuh (bukan error/blank).
2. Ulangi lewat tombol daftar melayang: di ponsel, scroll melewati hero sampai tombol muncul → ketuk → halaman pendaftaran terbuka.
3. Buka landing dengan `?utm_source=uji&utm_campaign=uji` → klik kedua CTA di atas → halaman pendaftaran tetap terbuka normal (dan setelah FR-18: parameter ikut di URL tujuan).
4. Klik tombol WhatsApp melayang → percakapan WA terbuka ke nomor benar.

Landing & konten existing:

5. Hero slider berganti otomatis; countdown jadwal berjalan; accordion Fakultas & Program Studi bisa dibuka; singkatan FEB dkk. tampil (setelah FR-21: aktifkan penerjemah otomatis browser ID→EN → FEB tetap FEB).
6. Kalkulator: pilih program studi, jalur, kelas → hasil perhitungan muncul.
7. Unduh satu dokumen biaya dari landing → PDF terunduh utuh.
8. Popup landing muncul sesuai aturan dan bisa ditutup; klik popup (bila ber-URL) membuka tujuannya.
9. Ganti bahasa ID↔EN via navbar → halaman berpindah locale tanpa 404.

Pengumuman (modul kembar yang berbagi komponen):

10. /pengumuman menampilkan daftar; buka satu detail → konten tampil; view-source memuat isi & meta.
11. Di admin: buat pengumuman baru, **sisipkan gambar lewat tombol gambar editor** (fitur RichTextEditor.tsx:178-200 — inilah yang terancam FR-08), terbitkan → tampil publik dengan gambarnya.

Admin & keamanan:

12. Login admin (dengan reCAPTCHA bila aktif) → berhasil; logout → sesi berakhir.
13. Login sebagai editor → akses /admin/pengguna → harus ditolak/redirect (RBAC), dan setelah rilis: akses /admin/artikel sesuai matriks SRS §6.
14. Simpan perubahan di salah satu modul admin (mis. FAQ: buat → ubah → hapus) → tidak ada 403 CSRF, data tersimpan, dialog sukses muncul (menguji Field/ModalShell/alur fetch bersama).
15. Upload gambar hero baru ≥2MB di /admin (pipeline diubah FR-19) → tersimpan, tampil di slider landing, dan ukuran yang dilayani sesuai batas.

SEO & infrastruktur:

16. `view-source` landing, satu pengumuman, dan (setelah rilis) satu artikel: canonical berdomain resmi, og:image di-fetch langsung mengembalikan gambar (FR-15), hreflang id/en ada (FR-16).
17. /sitemap.xml memuat pengumuman existing + artikel terbit + URL /en; /robots.txt tetap disallow /admin & /api.
18. Terbitkan artikel uji → verifikasi muncul di landing (≤ jendela revalidasi 60 detik), indeks, detail; arsipkan → hilang dari ketiganya dan dari sitemap; URL detailnya mengembalikan halaman tidak-ditemukan, bukan error 500.

## 9. Tingkat Risiko Keseluruhan: **TINGGI**

Bukan karena fitur artikel itu sendiri (aditif, koleksi baru, risiko DB rendah — §3), tapi karena kombinasi empat fakta:

1. Perubahan menyentuh jalur konversi tunggal bisnis (CTA daftar di Hero + tombol melayang yang hadir di SEMUA halaman) dan kontrak metadata bersama seluruh situs (buildMetadata) — dua permukaan dengan radius ledakan terbesar yang ada.
2. Rilis di tengah gelombang pendaftaran aktif — tidak ada jendela aman untuk salah.
3. Tidak ada test otomatis satu pun; seluruh jaring pengaman adalah checklist manusia di §8.
4. Konfigurasi deploy production sendiri belum terverifikasi dan saling bertentangan (port 9500 vs 9531, cwd menunjuk folder v.1.0.1 lama — ARCHITECTURE §7; nilai SITE_URL production UNKNOWN — SEO-13). Jalur rollback tidak terdokumentasi di mana pun.

**Perubahan paling berbahaya: FR-17 + FR-18 pada Hero.tsx dan DaftarFloatingButton.tsx.** Satu kesalahan pembentukan href atau handler klik mematikan tombol pendaftaran di semua halaman, saat kampanye berjalan, tanpa test yang menangkapnya, di deployment yang konfigurasinya belum pasti. Runner-up: penerapan larangan gambar artikel lewat RichTextEditor bersama — diam-diam mencabut fitur yang dipakai modul Pengumuman (§2).
