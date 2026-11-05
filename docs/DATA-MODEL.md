# Model Data — PMB Unjani

Database: MongoDB via Mongoose ^8.9.0 (package.json:32). Seluruh skema didefinisikan di `src/models/*.ts` (15 model). Dokumen ini deskriptif — menggambarkan skema apa adanya.

Ketentuan umum yang berlaku di semua model (kecuali disebut lain):

- Primary key: `_id` ObjectId (default MongoDB), tidak dideklarasikan eksplisit.
- Opsi skema `{ timestamps: true, versionKey: false }` → field otomatis `createdAt` & `updatedAt` (mis. src/models/Pengumuman.ts:20).
- "FK" berupa `ObjectId` dengan `ref` Mongoose; MongoDB TIDAK memberlakukan constraint referensial — integritas dijaga di level aplikasi.
- Tidak ada model yang menetapkan nama koleksi eksplisit; nama koleksi mengikuti pluralisasi default Mongoose. Nama pasti di database: UNKNOWN — perlu konfirmasi manual (butuh akses DB).
- Kolom "Wajib": `required: true`. Field tidak wajib tanpa default akan absen/undefined (setara nullable).

## 1. AdminUser (src/models/AdminUser.ts:4-26)

| Field | Tipe | Wajib | Default | Catatan |
|---|---|---|---|---|
| email | String | ya | — | unique + index, lowercase, trim (baris 6-13) |
| passwordHash | String | ya | — | `select: false` — tidak ikut ter-query default (baris 14) |
| nama | String | ya | — | trim |
| role | String enum `superadmin\|admin\|editor` | ya | `'editor'` | baris 16-21 |
| aktif | Boolean | tidak | `true` | |
| lastLoginAt | Date | tidak | — | diisi saat login (src/app/api/auth/login/route.ts:93) |

Method: `verifyPassword` (bcrypt.compare), static `hashPassword` (bcrypt cost 12) (baris 28-34).

## 2. AuditLog (src/models/AuditLog.ts:3-19)

| Field | Tipe | Wajib | Default | Catatan |
|---|---|---|---|---|
| userId | ObjectId → AdminUser | tidak | — | |
| email | String | tidak | `''` | |
| aksi | String | ya | — | nilai dipakai: create/update/delete/login/logout/upload (komentar baris 7) |
| entitas | String | ya | — | nama model terkait |
| entitasId | String | tidak | `''` | |
| ringkasan | String | tidak | `''` | |
| before | Mixed | tidak | `null` | snapshot sebelum perubahan |
| after | Mixed | tidak | `null` | snapshot sesudah perubahan |
| ip | String | tidak | `''` | |
| userAgent | String | tidak | `''` | |

Timestamps: hanya `createdAt` (updatedAt dimatikan, baris 16). Index: `{ createdAt: -1 }` (baris 19). Penulisan via `writeAuditLog()` yang menelan error (baris 29-46).

## 3. Biaya (src/models/Biaya.ts:3-17)

| Field | Tipe | Wajib | Default | Catatan |
|---|---|---|---|---|
| programStudi_id | ObjectId → ProgramStudi | ya | — | index |
| jalur_id | ObjectId → JalurSeleksi | ya | — | index |
| jadwal_id | ObjectId → Jadwal | ya | — | index |
| kelas_id | ObjectId → Kelas | tidak | — | index |
| biaya | Number | ya | — | min 0 |
| biayaPerSemester | Number | tidak | — | min 0 |
| biayaTambahan | Number | tidak | — | min 0 |
| persentase | [String] | tidak | `['100%']` | skema cicilan |
| createdBy / updatedBy | ObjectId → AdminUser | tidak | — | |

Tidak ada unique constraint gabungan (mis. kombinasi prodi+jalur+jadwal+kelas tidak dipaksa unik di skema).

## 4. Dokumen (src/models/Dokumen.ts:3-24)

| Field | Tipe | Wajib | Default | Catatan |
|---|---|---|---|---|
| kategori | String enum `biaya\|manual-book\|lainnya` | ya | — | index |
| tahun | String | tidak | `''` | index, maxlength 20 |
| judul | String | ya | — | |
| judul_en | String | tidak | `''` | |
| deskripsi | String | tidak | `''` | maxlength 500 |
| filename | String | ya | — | nama file di disk (uploads) |
| originalName | String | ya | — | |
| ukuranByte | Number | ya | — | |
| mime | String | ya | `'application/pdf'` | |
| uploadedBy | ObjectId → AdminUser | tidak | — | |
| urutan | Number | tidak | `100` | |
| aktif | Boolean | tidak | `true` | index |

## 5. FAQ (src/models/FAQ.ts:3-22)

| Field | Tipe | Wajib | Default | Catatan |
|---|---|---|---|---|
| pertanyaan / jawaban | String | ya | — | |
| pertanyaan_en / jawaban_en | String | tidak | `''` | |
| kategori | String enum `Teknis\|Biaya\|Jadwal` | ya | — | index |
| urutan | Number | tidak | `100` | index |
| aktif | Boolean | tidak | `true` | index |
| createdBy | ObjectId → AdminUser | tidak | — | |

Index gabungan: `{ aktif: 1, kategori: 1, urutan: 1 }` (baris 22).

## 6. Fakultas (src/models/Fakultas.ts:3-12)

| Field | Tipe | Wajib | Default |
|---|---|---|---|
| nama | String | ya | — |
| singkatan | String (uppercase) | ya | — |
| warna | String | tidak | — |
| createdBy / updatedBy | ObjectId → AdminUser | tidak | — |

Tidak ada unique constraint pada `nama`/`singkatan`.

## 7. Jadwal (src/models/Jadwal.ts:3-18)

| Field | Tipe | Wajib | Default | Catatan |
|---|---|---|---|---|
| judul | String | ya | — | |
| ke | Number | ya | — | min 1 (gelombang ke-n) |
| jalur | [ObjectId → JalurSeleksi] | ya | — | relasi many-to-many |
| mulai / selesai | Date | ya | — | |
| status | Boolean | tidak | `true` | index |
| tahun | String | ya | — | index |
| createdBy / updatedBy | ObjectId → AdminUser | tidak | — | |

Index gabungan: `{ tahun: 1, mulai: 1 }` (baris 18).

## 8. JalurSeleksi (src/models/JalurSeleksi.ts:3-18)

| Field | Tipe | Wajib | Default | Catatan |
|---|---|---|---|---|
| nama | String | ya | — | |
| nama_en | String | tidak | `''` | |
| slug | String | ya | — | unique + index, lowercase |
| ringkasan / ringkasan_en | String | tidak | `''` | maxlength 400 |
| deskripsi / deskripsi_en | String | tidak | `''` | HTML rich text |
| persyaratan | [String] | tidak | `[]` | |
| urutan | Number | tidak | `100` | index |
| aktif | Boolean | tidak | `true` | index |
| badge | String | tidak | `''` | label mis. "Baru"/"Favorit" |

## 9. Jenjang (src/models/Jenjang.ts:3-12)

Struktur identik dengan Fakultas: `nama` (wajib), `singkatan` (wajib, uppercase), `warna` (opsional), `createdBy`/`updatedBy`.

## 10. Kelas (src/models/Kelas.ts:3-11)

`nama` (wajib), `singkatan` (wajib, uppercase), `createdBy`/`updatedBy`. Tanpa `warna`.

## 11. PageContent (src/models/PageContent.ts:3-16)

| Field | Tipe | Wajib | Default | Catatan |
|---|---|---|---|---|
| kunci | String enum `hero\|about\|kontak\|footer` | ya | — | unique + index — maks 4 dokumen |
| data | Mixed | tidak | `{}` | isi bebas per halaman, tanpa skema |
| updatedBy | ObjectId → AdminUser | tidak | — | |

## 12. Pengumuman (src/models/Pengumuman.ts:3-23)

| Field | Tipe | Wajib | Default | Catatan |
|---|---|---|---|---|
| judul | String | ya | — | |
| judul_en | String | tidak | `''` | |
| slug | String | ya | — | unique + index, lowercase |
| ringkasan / ringkasan_en | String | tidak | `''` | maxlength 320 |
| konten / konten_en | String | tidak | `''` | HTML rich text |
| coverImage | String | tidak | `''` | |
| pinned | Boolean | tidak | `false` | index |
| publishedAt | Date | tidak | `now` | index |
| aktif | Boolean | tidak | `true` | index |
| metaTitle | String | tidak | `''` | maxlength 120 |
| metaDescription | String | tidak | `''` | maxlength 220 |
| createdBy | ObjectId → AdminUser | tidak | — | |

Index gabungan: `{ aktif: 1, publishedAt: -1 }` (baris 23).

## 13. Popup (src/models/Popup.ts:3-19)

| Field | Tipe | Wajib | Default | Catatan |
|---|---|---|---|---|
| judul | String | ya | — | |
| alt | String | tidak | `''` | |
| gambarFilename | String | ya | — | file di disk `uploads/popup/` (komentar baris 7) |
| gambarMime | String | tidak | `'image/jpeg'` | |
| url | String | tidak | `''` | kosong = tidak bisa diklik |
| aktif | Boolean | tidak | `true` | index |
| tampilDari / tampilSampai | Date | tidak | `null` | jendela tayang |
| hideForDays | Number | tidak | `1` | min 0, max 365 |
| durasiTampil | Number | tidak | `5` | detik; min 0, max 3600 |
| urutan | Number | tidak | `100` | |
| createdBy | ObjectId → AdminUser | tidak | — | |

## 14. ProgramStudi (src/models/ProgramStudi.ts:3-20)

| Field | Tipe | Wajib | Default | Catatan |
|---|---|---|---|---|
| nama | String | ya | — | |
| singkatan | String (uppercase) | ya | — | |
| jenjang_id | ObjectId → Jenjang | ya | — | TANPA index (beda dengan FK di Biaya) |
| fakultas_id | ObjectId → Fakultas | ya | — | TANPA index |
| akreditasi | String | tidak | `''` | |
| persyaratan | [String] | tidak | `[]` | |
| fileAkreditasi | subdok `{filename, originalName, ukuranByte}` | tidak | `''`/`''`/`0` | file di disk |
| createdBy / updatedBy | ObjectId → AdminUser | tidak | — | |

## 15. Settings (src/models/Settings.ts:21-46) — singleton

| Field | Tipe | Wajib | Default |
|---|---|---|---|
| singleton | String | tidak | `'main'` (unique + index) |
| siteName | String | tidak | `'PMB UNJANI'` |
| tagline | String | tidak | tagline default |
| urlPendaftaran | String | tidak | `'https://pendaftaran.unjani.ac.id/loginnew'` |
| alamat | String | tidak | alamat kampus Cimahi |
| email | String | tidak | `'pmb@unjani.ac.id'` |
| telepon / whatsapp | String | tidak | `''` |
| sosmed | [subdok `{nama, url, ikon}`] | tidak | `[]` |
| googleAnalyticsId / googleSiteVerification | String | tidak | `''` |
| defaultMetaTitle / defaultMetaDescription / ogImage | String | tidak | `''` |
| instagramAccessToken | String | tidak | `''` |
| instagramFeedAktif | Boolean | tidak | `true` |
| recaptcha | subdok `{aktif: false, siteKey: '', secretKey: ''}` | tidak | `{}` |
| updatedBy | ObjectId → AdminUser | tidak | — |

Pola singleton: `getSettings()` selalu findOne/create dokumen `singleton: 'main'` (baris 66-71).

## Relasi Antar Koleksi (tekstual)

- **Biaya** → banyak-ke-satu ke **ProgramStudi**, **JalurSeleksi**, **Jadwal**; opsional ke **Kelas** (src/models/Biaya.ts:5-8). Biaya adalah tabel penghubung tarif per kombinasi.
- **Jadwal** → banyak-ke-banyak ke **JalurSeleksi** via array `jalur` (src/models/Jadwal.ts:7).
- **ProgramStudi** → banyak-ke-satu ke **Jenjang** dan **Fakultas** (src/models/ProgramStudi.ts:7-8).
- **AuditLog.userId**, serta `createdBy`/`updatedBy`/`uploadedBy` di hampir semua koleksi → **AdminUser**.
- **Settings** dan **PageContent** berdiri sendiri (hanya `updatedBy` → AdminUser).

## Data Pribadi

- **Data pribadi PENDAFTAR: tidak ada.** Tidak satu pun koleksi menyimpan data calon mahasiswa; proses pendaftaran terjadi di sistem eksternal (`Settings.urlPendaftaran` default `pendaftaran.unjani.ac.id`, src/models/Settings.ts:26; tombol daftar src/app/[locale]/(public)/layout.tsx:45).
- Data pribadi yang ADA adalah milik **admin/pegawai**:
  - `AdminUser`: email, nama, passwordHash (bcrypt), lastLoginAt (src/models/AdminUser.ts:6-23).
  - `AuditLog`: email, ip, userAgent, plus snapshot `before`/`after` yang dapat memuat data AdminUser (src/models/AuditLog.ts:5-14).
- Rahasia/kredensial tersimpan di DB (bukan data pribadi, tapi sensitif): `Settings.recaptcha.secretKey` dan `Settings.instagramAccessToken` (src/models/Settings.ts:16,40).

## Field yang Tampak Tidak Terpakai

- `Settings.ogImage`, `Settings.defaultMetaTitle`, `Settings.defaultMetaDescription` — dapat diedit di /admin/pengaturan dan divalidasi API (src/app/api/admin/pengaturan/route.ts), tetapi tidak pernah dibaca kode frontend: `buildMetadata` memakai `/og-default.png` statis dan `DEFAULT_DESCRIPTION` hardcoded (src/lib/seo.ts:9-22,36); grep ketiga field hanya menemukan halaman pengaturan + API-nya.
- Apakah ada kolom yang **selalu kosong secara data aktual**: UNKNOWN — perlu konfirmasi manual (butuh query ke database; tidak bisa diverifikasi dari kode).
