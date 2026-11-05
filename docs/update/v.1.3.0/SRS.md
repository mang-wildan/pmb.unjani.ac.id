# SRS v1.3.0 — PMB Unjani

Sumber kebutuhan: wawancara pemilik produk (8 giliran, sesi 6 Agustus 2026) + docs/update/v1.3.0/SEO-AUDIT.md. Dokumen acuan kondisi existing: docs/ARCHITECTURE.md, docs/DATA-MODEL.md, docs/UI-CURRENT.md. SRS ini menjawab APA; keputusan BAGAIMANA ada di PLAN.md (dokumen terpisah).

## 1. Latar Belakang & Tujuan

Situs PMB saat ini efektif berupa one-pager tanpa kanal konten organik, sementara audit SEO menemukan satu temuan KRITIS dan enam PENTING yang membocorkan trafik serta membutakan pengukuran kampanye. v1.3.0 menambahkan modul Artikel (konten organik yang optimal untuk mesin pencari) dan menutup temuan audit tingkat KRITIS/PENTING, ditambah satu perbaikan tampilan singkatan fakultas yang salah diterjemahkan browser — semuanya dirilis secepatnya di tengah gelombang pendaftaran aktif tanpa mengganggu modul PMB inti.

## 2. Ruang Lingkup

**Termasuk:**

- Modul Artikel: CRUD admin (dengan kategori CRUD + tag), section 3 kartu di landing, halaman indeks `/artikel`, halaman detail `/artikel/[slug]`, dwibahasa opsional.
- Perbaikan SEO dari temuan KRITIS & PENTING: SEO-01, SEO-02, SEO-03, SEO-04, SEO-10 (dibatasi pipeline upload baru), SEO-13 (verifikasi rilis).
- Perbaikan singkatan fakultas/prodi di section "Fakultas & Program Studi" landing (anti auto-translate).
- Pembaruan sitemap dan pelacakan event analytics sebagai pendukung teknis pemasaran.

**TIDAK termasuk:**

- Semua temuan SEO tingkat MINOR (dirinci di §10).
- Pembersihan/kompresi ulang aset gambar lama (sisa SEO-10) — tugas operasional terpisah.
- SEM berbayar (Google Ads, bidding, anggaran iklan) — bukan kebutuhan sistem.
- Perubahan apa pun pada modul PMB inti: biaya, jadwal, jalur seleksi, program studi, kalkulator, autentikasi.
- Migrasi/penggabungan modul Pengumuman existing ke Artikel — Pengumuman tetap berjalan apa adanya.

## 3. Definisi Istilah

| Istilah | Arti |
|---|---|
| Artikel | Konten tulisan bergambar sampul yang dikelola admin dan tampil untuk publik |
| Kategori | Pengelompokan artikel, dikelola CRUD di admin; artikel difilter per kategori |
| Tag | Label teks bebas per artikel; bisa diklik untuk menyaring daftar artikel |
| Unggulan | Artikel yang disematkan agar tampil lebih dulu di landing |
| Draft / Terjadwal / Terbit / Arsip | Empat status siklus hidup artikel |
| Soft delete | Artikel ditandai terhapus (hilang dari semua tampilan normal) tapi datanya tersimpan dan bisa dipulihkan |
| Slug | Bagian URL unik artikel, dibuat otomatis dari judul |
| Sampul | Satu-satunya foto artikel; dipakai di kartu dan sebagai gambar OG |
| Ringkasan otomatis | Potongan awal isi artikel yang dibentuk sistem; admin tidak mengisi manual |
| Kartu artikel | Tampilan ringkas artikel: foto, judul, ringkasan, nama penulis, tanggal |
| hreflang / canonical | Penanda standar hubungan antar versi bahasa dan URL resmi sebuah halaman |
| Gambar OG | Gambar yang tampil saat halaman dibagikan ke media sosial/pesan |
| UTM | Parameter URL penanda sumber kampanye (utm_source, dst.) |
| Event konversi | Kejadian bernilai yang dicatat ke analytics (klik daftar, unduh, dsb.) |

## 4. Kebutuhan Fungsional

### FR-A — Modul Artikel

**FR-01 — CRUD artikel di panel admin.** Admin dapat membuat, melihat daftar, menyunting, menghapus (soft delete), dan memulihkan artikel.
- AC: Given admin (peran apa pun) sudah login, When ia membuat artikel baru dengan judul dan isi lalu menyimpan, Then artikel tersimpan berstatus Draft dan muncul di daftar artikel admin.

**FR-02 — Siklus status empat tahap.** Artikel berstatus Draft, Terjadwal, Terbit, atau Arsip. Hanya Terbit (dan Terjadwal yang waktunya sudah tiba) yang tampil publik.
- AC1: Given artikel Draft lengkap, When admin menerbitkannya, Then statusnya Terbit dan artikel tampil di halaman publik.
- AC2: Given artikel Terjadwal dengan waktu tayang besok pukul 09.00, When waktu tersebut tiba, Then artikel tampil publik tanpa tindakan admin apa pun.
- AC3: Given artikel Terbit, When admin mengarsipkannya, Then artikel hilang dari semua halaman publik tapi tetap terlihat di daftar admin berstatus Arsip.

**FR-03 — Slug otomatis dan terkunci setelah terbit.** Slug dibuat otomatis dari judul saat simpan pertama, tidak mengikuti perubahan judul, dan tidak dapat diubah setelah artikel pernah terbit.
- AC1: Given artikel baru berjudul "Beasiswa UNJANI 2027", When disimpan pertama kali, Then slug terbentuk otomatis dari judul tersebut.
- AC2: Given artikel sudah Terbit, When judulnya diubah, Then slug dan URL artikel tidak berubah dan URL lama tetap menampilkan artikel.

**FR-04 — Kategori artikel (CRUD).** Kategori dikelola CRUD di admin oleh semua peran; setiap artikel memiliki kategori; daftar artikel publik dapat difilter per kategori. (Jumlah kategori per artikel: TBD-05.)
- AC: Given kategori "Beasiswa" sudah dibuat, When admin membuat artikel dengan kategori tersebut lalu menerbitkannya, Then artikel tampil dengan label kategorinya dan muncul saat indeks difilter kategori "Beasiswa".

**FR-05 — Tag bebas sebagai label dan filter.** Admin dapat menambahkan tag teks bebas per artikel; tag tampil di artikel dan dapat diklik pengunjung untuk menyaring daftar.
- Keputusan koreksi UI pemilik produk 10 Agustus 2026: input tag admin ditampilkan sebagai chip berwarna sesuai brand, dapat ditambahkan dengan Enter/koma, dan dapat dihapus satu per satu.
- AC: Given dua artikel terbit ber-tag "snbt" dan satu artikel tanpa tag itu, When pengunjung mengklik tag "snbt", Then daftar hanya menampilkan dua artikel ber-tag tersebut.

**FR-06 — Penulis otomatis dari akun.** Nama penulis diambil otomatis dari akun admin yang membuat artikel; tidak ada input nama penulis manual.
- AC: Given editor bernama "Rina" login, When ia membuat dan menerbitkan artikel, Then kartu dan halaman detail menampilkan "Rina" sebagai penulis tanpa Rina mengetikkan namanya.

**FR-07 — Ringkasan otomatis.** Ringkasan pada kartu dipotong otomatis dari awal isi artikel (tanpa markup); tidak ada field ringkasan yang diisi admin.
- AC: Given artikel terbit dengan isi lebih panjang dari batas ringkasan, When kartunya tampil di landing/indeks, Then ringkasan berisi potongan awal isi berupa teks polos, dan form admin tidak memiliki field ringkasan.

**FR-08 — Sampul wajib dengan penyeragaman otomatis.** Setiap artikel wajib punya satu foto sampul untuk bisa terbit; sistem otomatis mengompres dan menyeragamkan ke rasio 16:9 lebar maksimum 1200px; badan artikel tidak memuat gambar sisipan.
- AC1: Given artikel Draft tanpa sampul, When admin mencoba menerbitkan/menjadwalkan, Then sistem menolak dengan pesan yang menjelaskan sampul wajib diisi.
- AC2: Given admin mengunggah sampul 4000×3000 piksel, When tersimpan, Then gambar yang dilayani ke publik berrasio 16:9, lebar ≤1200px, dan berukuran ≤300KB.

**FR-09 — Section artikel di landing: 3 kartu, unggulan dulu.** Landing menampilkan tepat 3 kartu (foto, judul, ringkasan, nama penulis, tanggal); artikel unggulan tampil lebih dulu, sisa slot diisi artikel terbit terbaru.
- AC1: Given 5 artikel Terbit dan 1 di antaranya unggulan, When landing dibuka, Then tampil tepat 3 kartu dengan artikel unggulan di posisi pertama dan 2 lainnya adalah yang terbaru.
- AC2: Given setiap kartu, When dilihat, Then memuat kelima unsur: foto sampul, judul, ringkasan, nama penulis, tanggal.

**FR-10 — Halaman indeks /artikel.** Menampilkan artikel terbit dengan pagination 9 per halaman (grid 3×3), filter kategori, dan pencarian pada judul.
- AC1: Given 20 artikel Terbit, When `/artikel` dibuka, Then tampil 9 kartu dan navigasi ke halaman berikutnya.
- AC2: Given pencarian kata "beasiswa", When dijalankan, Then hasil hanya artikel yang judulnya mengandung kata tersebut.

**FR-11 — Halaman detail /artikel/[slug], dirender server, dwibahasa fallback.** Halaman detail menampilkan isi penuh, penulis, tanggal, kategori, dan tag; konten dwibahasa memakai field `_en` opsional dengan fallback ke bahasa Indonesia; konten harus ada di HTML awal (bukan hasil render sisi klien).
- AC1: Given artikel Terbit, When URL detailnya dibuka dan sumber halaman (view-source) diperiksa, Then judul dan isi artikel ada di HTML awal.
- AC2: Given artikel tanpa `judul_en`, When halaman versi EN dibuka, Then tampil judul/isi bahasa Indonesia (fallback) tanpa error.

**FR-12 — SEO per artikel: meta manual opsional + fallback otomatis + data terstruktur.** Tersedia field meta title, meta description, dan gambar OG per artikel yang opsional; jika kosong, otomatis dari judul, potongan isi, dan sampul. Halaman detail menyajikan data terstruktur jenis artikel dan breadcrumb, konsisten pola pengumuman existing.
- Keputusan koreksi pemilik produk 10 Agustus 2026: gambar OG khusus dipilih melalui unggah berkas, bukan dengan mengetik path/URL; jika tidak diunggah, fallback sampul tetap berlaku.
- AC1: Given artikel tanpa meta manual, When halaman detail diperiksa, Then meta title = judul artikel, meta description = potongan isi, dan og:image = sampul artikel.
- AC2: Given meta title diisi manual, When halaman detail diperiksa, Then nilai manual yang dipakai.
- AC3: Given halaman detail artikel, When sumber halaman diperiksa, Then terdapat data terstruktur jenis artikel dengan tanggal terbit.

**FR-13 — Artikel otomatis masuk/keluar sitemap.** Artikel Terbit otomatis masuk sitemap.xml; artikel Arsip atau terhapus otomatis keluar.
- AC: Given artikel baru Terbit, When sitemap.xml diakses, Then URL artikel tersebut ada; When artikel itu diarsipkan/dihapus, Then URL-nya tidak lagi ada di sitemap.

**FR-14 — Soft delete dan pemulihan.** Penghapusan artikel bersifat soft delete; artikel terhapus hilang dari semua tampilan normal (admin & publik) tapi dapat dilihat di daftar terhapus dan dipulihkan oleh pemiliknya atau admin ke atas; pemulihan mengembalikan artikel ke keadaan sebelum dihapus.
- AC1: Given artikel Terbit dihapus, When daftar artikel admin dibuka, Then artikel tidak ada di daftar utama tapi ada di daftar terhapus, dan URL publiknya tidak lagi menampilkan artikel.
- AC2: Given artikel terhapus milik editor A, When editor B (bukan admin) membuka daftar terhapus, Then artikel milik A tidak dapat ia pulihkan.

### FR-B — Perbaikan SEO Teknis (sumber: SEO-AUDIT.md)

**FR-15 — Gambar OG default valid di semua halaman.** [SEO-01, KRITIS] Setiap halaman publik harus mengirim og:image/twitter:image yang menunjuk berkas gambar yang benar-benar ada (bukan 404).
- AC: Given halaman publik mana pun (termasuk yang tanpa gambar khusus), When URL og:image-nya diakses langsung, Then server mengembalikan berkas gambar, dan validator kartu media sosial menampilkan pratinjau bergambar.

**FR-16 — Dukungan dua bahasa untuk mesin pencari.** [SEO-02, PENTING] Versi EN ditarget penuh: setiap halaman publik memuat penanda hreflang id/en yang saling menunjuk, canonical tiap versi bahasa menunjuk URL bahasanya sendiri, dan URL versi `/en` masuk sitemap.
- AC1: Given halaman publik apa pun, When sumber halaman versi ID dan EN diperiksa, Then keduanya memuat hreflang untuk id dan en yang saling merujuk dengan benar.
- AC2: Given halaman versi EN, When canonical-nya diperiksa, Then menunjuk URL /en (bukan URL versi ID).
- AC3: Given sitemap.xml, When diperiksa, Then memuat URL versi EN dari halaman-halaman publik.

**FR-17 — Event konversi analytics.** [SEO-03, PENTING] Lima interaksi dicatat sebagai event ke analytics (GA4 yang sudah terpasang): (1) klik CTA Daftar di hero, (2) klik CTA Daftar tombol melayang, (3) klik tombol WhatsApp, (4) unduh dokumen, (5) interaksi kalkulator (submit hitung), plus (6) interaksi artikel (klik/baca artikel). Penamaan teknis event: TBD-08.
- AC: Given analytics aktif dan mode debug dibuka, When pengunjung melakukan masing-masing interaksi di atas, Then setiap interaksi tercatat sebagai event yang dapat dibedakan (termasuk lokasi klik untuk CTA Daftar hero vs tombol melayang).

**FR-18 — Parameter UTM diteruskan ke sistem pendaftaran.** [SEO-04, PENTING] Parameter kampanye (utm_*) yang ada di URL saat pengunjung tiba harus terbawa pada tautan keluar ke sistem pendaftaran eksternal.
- AC: Given pengunjung membuka landing dengan `?utm_source=instagram&utm_campaign=pmb2027`, When ia mengklik CTA Daftar (hero maupun tombol melayang), Then URL tujuan pendaftaran memuat parameter utm yang sama.
- **Catatan verifikasi (6 Agustus 2026):** halaman login sistem pendaftaran terbukti menoleransi `utm_*` (tidak error), TAPI servernya me-redirect dan membuang parameter sebelum halaman final. AC di atas hanya bisa dipenuhi sampai request pertama; nilai atribusinya bergantung pada pencatatan di sisi tim pendaftaran → TBD-09. Rincian: IMPACT.md §6.

**FR-19 — Kompresi otomatis semua upload gambar publik baru.** [SEO-10, PENTING — dibatasi: hanya pipeline upload baru] Setiap gambar baru yang diunggah admin untuk tampilan publik (gambar hero, sampul artikel) otomatis dikompres ke ≤300KB dengan dimensi wajar sebelum dilayani. Pembersihan aset lama di luar cakupan (§10).
- AC: Given admin mengunggah gambar hero baru berukuran 2MB, When gambar tersimpan dan dilayani di landing, Then berkas yang diterima pengunjung berukuran ≤300KB.

**FR-20 — Verifikasi konfigurasi production sebagai gerbang rilis.** [SEO-13, PENTING] Sebelum v1.3.0 dinyatakan rilis, empat hal diverifikasi pada URL production dan hasilnya didokumentasikan: (a) canonical/sitemap memakai domain resmi (bukan localhost), (b) ID analytics terisi dan mengirim data, (c) HTTP pada host resmi non-www mengarah ke HTTPS pada host yang sama, (d) header cache aset statis diketahui. Varian `www` sengaja dikecualikan dari acceptance criteria berdasarkan keputusan pemilik produk 7 Agustus 2026.
- AC: Given checklist verifikasi dijalankan pada situs live, When keempat pemeriksaan selesai, Then setiap butir berstatus lulus/tidak dengan bukti (URL + hasil), dan butir yang gagal diperbaiki sebelum rilis dinyatakan selesai.

### FR-C — Perbaikan Landing Page

**FR-21 — Singkatan fakultas/prodi kebal terjemahan otomatis.** Singkatan pada section "Fakultas & Program Studi" (mis. FEB, FT) tidak boleh berubah saat browser menerjemahkan halaman; nama lengkap tersedia sebagai teks bantu (tooltip/pembaca layar); tampilan visual tidak berubah dari sekarang.
- AC1: Given landing dibuka di browser dengan terjemahan otomatis aktif (ID→EN), When section Fakultas & Program Studi tampil, Then "FEB" tetap tertulis "FEB" (tidak menjadi "February"/"Feb").
- AC2: Given kartu fakultas, When singkatan di-hover atau dibaca pembaca layar, Then nama lengkap fakultas tersedia.
- AC3: Given tampilan sebelum dan sesudah perbaikan, When dibandingkan visual tanpa fitur terjemahan, Then tidak ada perubahan tampilan.

## 5. Kebutuhan Data

Konsisten dengan konvensi DATA-MODEL.md: PK `_id` ObjectId; `createdAt`/`updatedAt` otomatis; relasi berupa ObjectId ref tanpa constraint DB (integritas di aplikasi); field Indonesia + varian `_en`.

### Koleksi baru: Artikel

| Field | Tipe | Wajib | Default | Index | Keterangan |
|---|---|---|---|---|---|
| judul | String | ya | — | — | |
| judul_en | String | tidak | `''` | — | fallback ke judul |
| slug | String | ya | — | unique + index | dibuat otomatis sekali; terkunci setelah pernah terbit (FR-03) |
| isi | String (HTML rich text) | ya | — | — | tanpa gambar sisipan (FR-08) |
| isi_en | String | tidak | `''` | — | fallback ke isi |
| coverImage | String | wajib saat status ≠ Draft | `''` | — | nama berkas sampul; konsisten penamaan Pengumuman.coverImage |
| status | String enum `draft\|terjadwal\|terbit\|arsip` | ya | `'draft'` | index | FR-02 |
| publishedAt | Date | wajib untuk terjadwal/terbit | null | index (gabungan dengan status) | waktu tayang; masa depan = terjadwal |
| pinned | Boolean | tidak | `false` | index | "Unggulan" (FR-09); konsisten Pengumuman.pinned |
| kategori_id | ObjectId → KategoriArtikel | ya | — | index | tunggal/array: TBD-05 |
| tags | [String] | tidak | `[]` | index | filter klik (FR-05) |
| metaTitle | String | tidak | `''` | — | fallback judul (FR-12) |
| metaDescription | String | tidak | `''` | — | fallback potongan isi |
| ogImage | String | tidak | `''` | — | fallback coverImage |
| createdBy | ObjectId → AdminUser | ya | — | index | penulis (FR-06) & basis aturan kepemilikan |
| updatedBy | ObjectId → AdminUser | tidak | — | — | |
| deletedAt | Date | tidak | null | index | soft delete (FR-14); null = tidak terhapus |
| deletedBy | ObjectId → AdminUser | tidak | — | — | |

Catatan: ringkasan TIDAK disimpan sebagai field (diturunkan otomatis dari `isi`, FR-07). Index gabungan yang dibutuhkan pola baca publik: `{status, publishedAt desc}` dan `{pinned, publishedAt desc}` (mengikuti pola Pengumuman `{aktif, publishedAt: -1}`).

### Koleksi baru: KategoriArtikel

| Field | Tipe | Wajib | Default | Index | Keterangan |
|---|---|---|---|---|---|
| nama | String | ya | — | — | |
| nama_en | String | tidak | `''` | — | |
| slug | String | ya | — | unique + index | dipakai filter URL indeks |
| createdBy / updatedBy | ObjectId → AdminUser | tidak | — | — | |

### Relasi ke koleksi existing

- `Artikel.createdBy/updatedBy/deletedBy` → **AdminUser** (nama penulis dibaca dari akun; lihat kondisi tepi §7.4).
- `Artikel.kategori_id` → **KategoriArtikel** (koleksi baru).
- Tidak ada perubahan skema pada koleksi existing mana pun.
- Setiap mutasi artikel/kategori tercatat ke **AuditLog** mengikuti pola modul existing.

## 6. Peran & Hak Akses

Semua peran punya akses modul artikel (CRUD penuh atas miliknya); pembeda utama adalah artikel milik orang lain.

| Aksi | Editor | Admin | Superadmin |
|---|---|---|---|
| Membuat artikel | ✓ | ✓ | ✓ |
| Menyunting artikel milik sendiri | ✓ | ✓ | ✓ |
| Menyunting artikel milik orang lain | ✗ | ✓ | ✓ |
| Terbitkan/jadwalkan/arsipkan milik sendiri | ✓ | ✓ | ✓ |
| Terbitkan/jadwalkan/arsipkan milik orang lain | ✗ | ✓ | ✓ |
| Hapus (soft delete) milik sendiri | ✓ | ✓ | ✓ |
| Hapus milik orang lain | ✗ | ✓ | ✓ |
| Melihat daftar terhapus | miliknya | semua | semua |
| Memulihkan artikel | miliknya | semua | semua |
| CRUD kategori artikel | ✓ | ✓ | ✓ |

## 7. Kondisi Tepi

1. **Judul duplikat.** Dua artikel boleh berjudul sama; sistem tidak menolak. Slug keduanya wajib tetap unik — pembeda dibuat otomatis, dan penyimpanan tidak boleh gagal tanpa pesan yang jelas.
2. **Slug bentrok.** Bila slug hasil generate sudah dipakai artikel lain (termasuk yang terhapus soft delete), sistem wajib menghasilkan slug unik lain secara otomatis; tidak boleh menimpa atau menggagalkan simpan secara diam-diam.
3. **Artikel tanpa gambar.** Draft boleh tersimpan tanpa sampul; perpindahan ke Terjadwal/Terbit ditolak dengan pesan (FR-08 AC1). Tidak ada kartu publik tanpa foto.
4. **Penulis yang akunnya dinonaktifkan/dihapus.** Artikel tetap tampil normal dan nama penulis tetap muncul di kartu serta halaman detail; penonaktifan/penghapusan akun tidak boleh menyebabkan halaman error atau nama penulis hilang.
5. **Artikel dihapus/diarsip tapi URL-nya sudah terindeks Google.** URL detail mengembalikan status "tidak ditemukan" (404/410, bukan error 500) dan URL keluar dari sitemap (FR-13). Bila artikel dipulihkan, URL yang sama hidup kembali (slug tidak berubah — FR-03).
6. **Artikel Terjadwal berwaktu lampau.** Perilaku saat admin menyimpan jadwal dengan waktu yang sudah lewat: TBD-06.
7. **Kategori dihapus padahal masih dipakai artikel.** Tidak boleh membuat artikel/halaman error; perilaku pastinya (blokir penghapusan vs lepas relasi): TBD-07.

## 8. Batasan (yang tidak boleh berubah)

- Koleksi dan halaman modul PMB inti: Biaya, Jadwal, JalurSeleksi, ProgramStudi (beserta Fakultas/Jenjang/Kelas sebagai datanya), kalkulator, dan seluruh mekanisme autentikasi — tidak boleh diubah.
- Alur pendaftaran ke sistem eksternal tidak boleh terganggu; FR-18 hanya menambah parameter pada URL tujuan.
- `.env`, konfigurasi auth, dan aturan lain di AGENTS.md tetap berlaku.
- Rilis berlangsung di tengah gelombang pendaftaran aktif: tanpa downtime dan tanpa perubahan perilaku halaman existing di luar yang disebut SRS ini.
- Modul Pengumuman existing tidak diubah (artikel adalah modul baru yang berdampingan).

## 9. Kebutuhan Non-Fungsional

- **Indeksabilitas:** ketiga halaman artikel (landing section, indeks, detail) dirender server-side; konten ada di HTML awal (FR-11).
- **Performa landing:** penambahan section artikel tidak boleh memperberat landing secara signifikan; gambar kartu dimuat lazy; angka target waktu muat spesifik: TBD-01 (menunggu baseline).
- **Gambar:** sampul tersimpan 16:9, lebar ≤1200px, ≤300KB (FR-08); semua upload gambar publik baru ≤300KB (FR-19); batas ukuran berkas input sebelum kompres: TBD-02.
- **Mobile-first:** ketiga tampilan artikel harus mobile-ready sesuai kriteria docs/UI-CURRENT.md §5 (breakpoint responsif, tanpa elemen terpotong di layar sempit).
- **Keamanan upload:** hanya jenis berkas gambar yang diizinkan; isi berkas divalidasi di sisi server (bukan hanya ekstensi); nama berkas tersimpan aman; upload hanya oleh pengguna terautentikasi dengan peran yang berhak — setara standar upload modul existing.
- **Data pribadi:** modul artikel tidak menambah penyimpanan data pribadi pendaftar; data penulis yang tampil publik terbatas nama; artikel soft delete tidak boleh bocor lewat halaman maupun API publik.
- **Auditabilitas:** semua mutasi artikel & kategori tercatat di log audit seperti modul lain.

## 10. Di Luar Cakupan v1.3.0

Temuan SEO tingkat MINOR (ditunda, tetap terdokumentasi di SEO-AUDIT.md):

- SEO-05 — H1 halaman /pengumuman & /kontak
- SEO-06 — fallback no-js untuk animasi Reveal
- SEO-07 — JSON-LD global disuntik setelah hidrasi
- SEO-08 — logo pada Organization JSON-LD menunjuk berkas tak ada
- SEO-09 — favicon 270KB / apple-touch-icon
- SEO-11 — Font Awesome dimuat global di halaman publik
- SEO-12 — alt gambar popup boleh kosong

Lainnya:

- Pembersihan, kompresi ulang, dan penghapusan duplikat aset gambar lama (sisa SEO-10) — operasional.
- SEM berbayar: pemasangan/pengelolaan iklan, bidding, anggaran — di luar kebutuhan sistem.
- Migrasi konten Pengumuman ke Artikel.
- Gambar sisipan di dalam badan artikel (diputuskan sampul saja).
- Halaman arsip/indeks per penulis.

## 11. Daftar TBD

| No | Hal | Menunggu |
|---|---|---|
| TBD-01 | Angka target waktu muat landing | Baseline lab test setelah implementasi awal |
| TBD-02 | Batas ukuran berkas upload (MB) sampul & hero sebelum kompresi | DIPUTUSKAN 7 Agustus 2026: gunakan batas upload existing di konfigurasi lingkungan |
| TBD-03 | Tanggal rilis pasti (baru "secepatnya, gelombang aktif") | Keputusan pemilik produk |
| TBD-04 | Hasil verifikasi runtime production FR-20: SITE_URL, ID GA4, redirect HTTP→HTTPS pada host resmi, header cache; varian `www` dikecualikan | Pemeriksaan manual di server live; pengecualian `www` diputuskan pemilik produk 7 Agustus 2026 |
| TBD-05 | Jumlah kategori per artikel: satu atau boleh banyak | DIPUTUSKAN 7 Agustus 2026: satu kategori per artikel |
| TBD-06 | Perilaku artikel Terjadwal dengan waktu yang sudah lampau | DIPUTUSKAN 7 Agustus 2026: form menolak dengan pesan kesalahan |
| TBD-07 | Perilaku penghapusan kategori yang masih dipakai artikel | DIPUTUSKAN 7 Agustus 2026: penghapusan diblokir dengan pesan |
| TBD-08 | Nama & parameter teknis event analytics (FR-17) | Ditetapkan saat implementasi |
| TBD-09 | Atribusi UTM lintas domain (FR-18): server pendaftaran membuang parameter saat redirect — apakah access log mereka mencatat query string, atau redirect bisa dipertahankan membawa parameter | Jawaban tertulis tim pengelola pendaftaran.unjani.ac.id |
