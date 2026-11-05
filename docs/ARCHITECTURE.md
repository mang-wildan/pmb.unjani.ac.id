# Arsitektur — PMB Unjani

Dokumen deskriptif: menggambarkan kondisi kode per versi 1.2.0 (package.json:3).

## 1. Stack & Versi

| Komponen | Versi | Bukti |
|---|---|---|
| Next.js (App Router) | 16.2.4 | package.json:33 |
| React / React DOM | 19.2.5 | package.json:36-37 |
| TypeScript | ^5.6.2 | package.json:59 |
| Node.js (runtime) | >= 20.9.0 | package.json:6-8 |
| MongoDB via Mongoose | ^8.9.0 | package.json:32 |
| Tailwind CSS | ^3.4.13 | package.json:57 |
| next-intl (i18n id/en, default `id`, prefix `as-needed`) | ^4.9.1 | package.json:34, src/i18n/routing.ts:3-7 |
| jose (JWT HS256) | ^5.9.6 | package.json:30, src/lib/auth.ts:26-31 |
| Zod (validasi) | ^3.23.8 | package.json:43 |
| Tiptap (rich text editor admin) | ^2.6.6 | package.json:19-23 |
| formidable + sharp + file-type (upload) | ^3.5.2 / ^0.34.5 / ^16.5.4 | package.json:28-29,39 |
| Proses production: PM2 fork 1 instance | — | ecosystem.config.js |

Middleware global bernama `proxy` (konvensi Next 16) di src/proxy.ts, matcher semua path non-aset (src/proxy.ts:10-12).

## 2. Alur Request End-to-End (3 halaman terpenting)

### a. Landing page `/` (publik)

1. Request masuk → src/proxy.ts:94-148 — bukan /admin & bukan /api → diteruskan ke `intlMiddleware` (locale routing, src/proxy.ts:147).
2. Server Component src/app/[locale]/(public)/page.tsx dirender dengan `revalidate = 60` (page.tsx:39).
3. Halaman memanggil `connectDb()` lalu query langsung ke Mongoose (tanpa lewat API): Settings, JalurSeleksi, Jadwal, Dokumen, Pengumuman, PageContent, FAQ, Fakultas, ProgramStudi, Biaya, Popup (page.tsx:3-17,70-80).
4. Fetch eksternal opsional ke Instagram Graph API bila token tersedia, cache 1 jam, timeout 5 detik (page.tsx:50-64).
5. Render komponen section: Hero, JalurList, JadwalHighlights, DokumenList, PengumumanList, FAQAccordion, KalkulatorForm, InstagramFeed, LandingPopup (page.tsx:18-36).

### b. Detail pengumuman `/pengumuman/[slug]` (publik)

1. proxy → locale routing (sama seperti di atas).
2. src/app/[locale]/(public)/pengumuman/[slug]/page.tsx: `connectDb()` → `Pengumuman.findOne({ slug, aktif: true })`; tidak ketemu → `notFound()` (page.tsx:44-46).
3. Konten dipilih per locale (fallback ke Indonesia), HTML disanitasi via `sanitizeRichText` dari src/lib/sanitize.ts (page.tsx:8,48-50).
4. `generateMetadata` query dokumen yang sama untuk SEO (page.tsx:15-34).

### c. Login admin → halaman admin

1. Halaman src/app/admin/login/page.tsx (client) mengambil konfigurasi reCAPTCHA dari GET /api/auth/login-config (src/app/api/auth/login-config/route.ts:9-19).
2. Submit → POST /api/auth/login (src/app/api/auth/login/route.ts:26-114): rate limit per IP (default 5/menit, route.ts:27-35) → validasi Zod → verifikasi reCAPTCHA bila aktif di Settings (route.ts:52-68) → cari AdminUser aktif + `verifyPassword` → tanda tangan access token (1 jam) & refresh token (7 hari) → set cookie httpOnly `pmb_session` & `pmb_refresh` (route.ts:107-113) → tulis audit log (route.ts:96-105).
3. Request halaman /admin/* berikutnya dicegat src/proxy.ts:98-136: tanpa sesi → redirect /admin/login; sesi ada → cek RBAC per path (`canAccessPage`/`canAccessApi`, src/lib/permissions.ts) → lolos → render src/app/admin/layout.tsx yang membaca sesi lagi via `getSession()` dan membungkus konten dengan AdminShell (layout.tsx:6-16).
4. Mutasi ke /api/admin/* juga melewati cek origin CSRF di src/proxy.ts:115-117, lalu guard `requireAdmin` di tiap handler (src/lib/adminGuard.ts:6-19).

## 3. Daftar Route

### Halaman publik (prefix locale `id`/`en`, handler = page.tsx di folder tsb)

`/`, `/biaya-pendidikan`, `/jadwal`, `/jalur-seleksi`, `/kalkulator`, `/kontak`, `/manual-book`, `/pengumuman`, `/pengumuman/[slug]` — semua di src/app/[locale]/(public)/. Plus src/app/not-found.tsx.

### Halaman admin (tanpa locale, handler = page.tsx di src/app/admin/)

`/admin` (dashboard), `/admin/login`, `/admin/biaya`, `/admin/dokumen`, `/admin/fakultas`, `/admin/faq`, `/admin/halaman`, `/admin/jadwal`, `/admin/jalur-seleksi`, `/admin/jenjang`, `/admin/kelas`, `/admin/log-aktivitas`, `/admin/pengaturan`, `/admin/pengguna`, `/admin/pengumuman` (+ `/tambah`, `/[id]/edit`), `/admin/popup`, `/admin/program-studi`.

### API (handler = route.ts di folder tsb, semua di src/app/api/)

| Endpoint | Metode | Keterangan |
|---|---|---|
| /api/auth/login | POST | Login + rate limit + reCAPTCHA opsional |
| /api/auth/login-config | GET | Konfigurasi publik reCAPTCHA |
| /api/auth/logout | POST | Hapus cookie sesi (CSRF origin dicek di proxy, src/proxy.ts:140-142) |
| /api/auth/me | GET | Info sesi berjalan |
| /api/files/[id] | GET | Sajikan file Dokumen dari disk (publik) |
| /api/popup-image/[id] | GET | Sajikan gambar popup (publik) |
| /api/program-studi/[id]/akreditasi | GET | File akreditasi prodi (publik) |
| /api/admin/{biaya, fakultas, faq, jadwal, jalur-seleksi, jenjang, kelas, pengguna, pengumuman, popup, program-studi} | GET, POST | List + create per entitas |
| /api/admin/{entitas}/[id] | PUT, DELETE (jalur-seleksi & pengumuman juga GET) | Update/hapus per entitas |
| /api/admin/{biaya, program-studi}/export | GET | Ekspor Excel |
| /api/admin/{biaya, fakultas, jenjang, program-studi}/import | POST | Impor Excel |
| /api/admin/{biaya, fakultas, jenjang, program-studi}/template | GET | Template impor |
| /api/admin/program-studi | DELETE (tambahan) | src/app/api/admin/program-studi/route.ts |
| /api/admin/program-studi/[id]/akreditasi | POST, DELETE | Upload/hapus file akreditasi |
| /api/admin/dokumen | GET; /upload POST; /[id] PUT, DELETE | Dokumen PDF |
| /api/admin/hero-images/upload | POST | Upload gambar hero |
| /api/admin/hero-images/[filename] | DELETE | Hapus gambar hero |
| /api/admin/upload-image | POST | Upload gambar konten (editor) |
| /api/admin/halaman | GET, PUT | Konten halaman statis |
| /api/admin/pengaturan | GET, PUT | Pengaturan situs |
| /api/admin/log-aktivitas | GET; /laporan GET | Audit log + laporan |
| /api/admin/stats | GET | Statistik dashboard |

(Metode diverifikasi dari deklarasi `export async function` di tiap route.ts; 49 route mendeklarasikan `runtime = 'nodejs'`.)

## 4. Autentikasi & Otorisasi

- Mekanisme: JWT HS256 via jose, disimpan di cookie httpOnly `pmb_session` (akses, TTL 1 jam) dan `pmb_refresh` (TTL 7 hari); `sameSite: lax`, `secure` di production (src/lib/auth.ts:5-10,74-82).
- Kredensial: AdminUser dengan `passwordHash` bcryptjs, dicek via `user.verifyPassword` (src/app/api/auth/login/route.ts:70-79, package.json:24).
- Role: `editor < admin < superadmin` (src/lib/rbac.ts:3-5).
- Titik pemeriksaan (3 lapis):
  1. src/proxy.ts:98-136 — semua /admin/* & /api/admin/*: wajib sesi valid; RBAC per path via `canAccessPage`/`canAccessApi` (src/lib/permissions.ts); CSRF origin check untuk metode tulis /api/admin/* (src/proxy.ts:8,115-117) dan /api/auth/logout (src/proxy.ts:140-142).
  2. `requireAdmin(req, minRole)` di tiap handler API admin (src/lib/adminGuard.ts:6-19).
  3. src/app/admin/layout.tsx:7-10 — baca ulang sesi untuk render shell.
- Rate limit login: LRU in-memory per IP, default 5 percobaan/60 detik, env `LOGIN_RATE_LIMIT` (src/lib/rateLimit.ts:7-20, src/app/api/auth/login/route.ts:27-35). Catatan deskriptif: penyimpanan in-memory, per proses.
- Peta akses menu/halaman per role didefinisikan di `ADMIN_NAV` (src/lib/permissions.ts:12-36); `/admin/pengguna` khusus superadmin.

## 5. Integrasi Eksternal

| Integrasi | Untuk apa | Bukti |
|---|---|---|
| Google reCAPTCHA siteverify | Verifikasi login admin, aktif/nonaktif via Settings | src/app/api/auth/login/route.ts:52-68 |
| Instagram Graph API (`graph.instagram.com/me/media`) | Feed 4 post di landing page; token dari Settings atau env `INSTAGRAM_ACCESS_TOKEN` | src/app/[locale]/(public)/page.tsx:50-64 |
| Sistem pendaftaran eksternal `pendaftaran.unjani.ac.id` | Tombol "Daftar" mengarah keluar; URL dari Settings `urlPendaftaran`, fallback hardcoded | src/app/[locale]/(public)/layout.tsx:45 |

Payment gateway, email/SMS: tidak ditemukan (grep nodemailer/smtp/twilio/midtrans/xendit/payment di src/ nihil).

## 6. Job / Cron / Scheduler

Tidak ada job terjadwal sisi server. Grep `cron|setInterval|node-schedule|agenda` hanya menemukan timer UI klien (src/components/public/HeroSlider.tsx:16, src/components/public/JadwalCountdown.tsx:71). PM2 hanya menjalankan 1 proses `next start` tanpa cron_restart (ecosystem.config.js).

## 7. Bagian yang Tampak Tidak Terpakai / Duplikat / Tidak Konsisten

- `verifyRefreshToken` tidak pernah dipanggil dan tidak ada endpoint refresh token; `pmb_refresh` hanya di-set saat login dan dihapus saat logout — token refresh tidak pernah dikonsumsi (src/lib/auth.ts:51-61; grep `verifyRefreshToken` hanya di lib/auth.ts).
- `CSRF_COOKIE = 'pmb_csrf'` dideklarasikan tapi tidak dipakai di mana pun; proteksi CSRF nyata memakai cek origin di proxy (src/lib/auth.ts:7, src/proxy.ts:78-88).
- `json()` dan `getClientIp()` di src/lib/http.ts:3-18 tidak diimpor file lain; `getClientIp` duplikat fungsional `clientIpFromHeaders` (src/lib/http.ts:11-26).
- Dependency `nodemon` terdaftar di dependencies tapi tidak dipakai script mana pun (package.json:35).
- `.htaccess` hanya berisi komentar placeholder Apache — tidak berfungsi di stack Node/Next (.htaccess:1).
- Ketidaksesuaian port & path deploy: ecosystem.config.js memakai `PORT: 9500` dan `cwd: /www/wwwroot/dev-pmb.unjani.ac.id/v.1.0.1`, sedangkan package.json:13 `next start -p 9531`. Mana yang berlaku di server production: UNKNOWN — perlu konfirmasi manual.
- src/app/[locale]/(public)/pengumuman/[slug]/page.tsx:12-13 menetapkan `dynamic = 'force-dynamic'` sekaligus `revalidate = 60` — dengan force-dynamic, nilai revalidate tidak berefek.
- File log dev (`.next-dev-9501*.log`, `.next-start-9500*.log`) dan `tsconfig.tsbuildinfo` ikut berada di root folder proyek.
