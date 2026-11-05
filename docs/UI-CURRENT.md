# UI Saat Ini — PMB Unjani

Dokumen deskriptif kondisi UI per versi 1.2.0. Dipakai sebagai baseline analisis dampak sebelum perubahan UI (mis. v1.3.0).

## 1. Framework CSS/UI

- Tailwind CSS ^3.4.13 (package.json:57) dengan tema kustom: palet `brand` (hijau, #24b47f — src/lib/swal.ts:3), palet `ink`, fontFamily kustom (tailwind.config.ts:8-36). CSS global: src/styles/globals.css.
- Font Awesome Free ^7.2.0 — ikon menu admin (`fa-solid fa-*` di src/lib/permissions.ts:13-35) (package.json:18).
- SweetAlert2 ^11.26.24 — dialog sukses/error/konfirmasi, di-styling via mixin kustom (src/lib/swal.ts) (package.json:41).
- Tiptap ^2.6.6 — rich text editor di form pengumuman (package.json:19-23).
- Tidak ada library komponen jadi (Bootstrap/MUI/shadcn); komponen dibangun sendiri di src/components/.

## 2. Daftar Halaman + File View

### Publik (semua di src/app/[locale]/(public)/, dibungkus layout.tsx grup tsb)

| Halaman | File view | Catatan |
|---|---|---|
| `/` (landing) | page.tsx | Satu-satunya halaman konten utama; semua section di sini |
| `/pengumuman` | pengumuman/page.tsx | |
| `/pengumuman/[slug]` | pengumuman/[slug]/page.tsx | |
| `/kontak` | kontak/page.tsx | |
| `/biaya-pendidikan`, `/jadwal`, `/jalur-seleksi`, `/kalkulator`, `/manual-book` | masing-masing page.tsx (5 baris) | **Hanya `permanentRedirect('/')`** — konten aslinya sudah dilebur ke landing |
| 404 | src/app/not-found.tsx | |

### Admin (src/app/admin/, dibungkus layout.tsx + AdminShell bila ada sesi)

`/admin` (dashboard), `/admin/login`, dan 14 modul: biaya, dokumen, fakultas, faq, halaman, jadwal, jalur-seleksi, jenjang, kelas, log-aktivitas, pengaturan, pengguna, pengumuman (list + `tambah/` + `[id]/edit/`, form bersama di `_form/PengumumanForm.tsx`), popup, program-studi — masing-masing `page.tsx` di foldernya.

## 3. Komponen Dipakai Ulang + Lokasi Pemakaian (lengkap, hasil grep impor)

### src/components/admin/

| Komponen | Dipakai di |
|---|---|
| AdminShell | src/app/admin/layout.tsx → membungkus SEMUA halaman admin ber-sesi |
| AdminTopbar | hanya AdminShell.tsx |
| Sidebar | hanya AdminShell.tsx |
| PageHeader | 16 file: semua page.tsx admin modul (biaya, dokumen, fakultas, faq, halaman, jadwal, jalur-seleksi, jenjang, kelas, log-aktivitas, pengaturan, pengguna, pengumuman, popup, program-studi) + PengumumanForm |
| Field (+ inputClass/textareaClass/selectClass) | 16 file admin yang sama dengan PageHeader + src/components/ui/SearchableSelect.tsx |
| ModalShell | 13 file: biaya, dokumen, fakultas, faq, jadwal, jalur-seleksi, jenjang, kelas, log-aktivitas, pengguna, popup, program-studi, PengumumanForm |
| TableLoadingRow | 12 file: biaya, dokumen, fakultas, faq, jadwal, jalur-seleksi, jenjang, kelas, log-aktivitas, pengguna, pengumuman, program-studi |
| RichTextEditor | hanya PengumumanForm.tsx |

### src/components/ui/

| Komponen | Dipakai di |
|---|---|
| Card / SectionHeading | Halaman: landing, /pengumuman, /kontak. Komponen: DokumenList, FakultasProdiSection, JadwalHighlights, JalurList, KalkulatorForm, PengumumanList |
| SearchableSelect | Landing (via KalkulatorForm & langsung), 9 halaman admin: biaya, dokumen, faq, jadwal, log-aktivitas, pengguna, pengumuman, popup, program-studi |
| RippleLoader | admin halaman, pengaturan, popup + TableLoadingRow (→ efektif semua halaman bertabel) |
| **Button** | **Tidak diimpor file mana pun** (grep pola impor nihil) |

### src/components/public/

| Komponen | Dipakai di |
|---|---|
| Navbar (memuat LanguageSwitcher) | layout publik → semua halaman publik |
| Footer | layout publik → semua halaman publik |
| DaftarFloatingButton, WhatsAppFloatingButton | layout publik → semua halaman publik |
| Hero (memuat HeroSlider + HeroGelombangInfo) | landing |
| JadwalHighlights (memuat JadwalCountdown) | landing |
| JalurList (memuat JalurAccordion) | landing |
| DokumenList, FAQAccordion, FakultasProdiSection, InstagramFeed, KalkulatorForm, LandingPopup | landing |
| Reveal | landing + FakultasProdiSection |
| PengumumanList | landing + /pengumuman |
| JsonLd | landing, /pengumuman, /pengumuman/[slug], /kontak |
| **JadwalTable, KalkulatorEmbed** | **Tidak diimpor file mana pun** — tampak sisa halaman /jadwal & /kalkulator yang kini redirect |

## 4. Pola Form, Validasi & Tampilan Error

- Halaman admin = client component: muat data via `fetch('/api/admin/...', { cache: 'no-store' })`, simpan via fetch POST/PUT, hapus via DELETE (src/app/admin/faq/page.tsx:50,65,87).
- Form CRUD ditampilkan dalam modal `ModalShell`; setiap input dibungkus `Field` dengan label uppercase, `hint` opsional, dan error inline merah ber-`role="alert"` (src/components/admin/Field.tsx:19-38). Styling input seragam via konstanta `inputClass`/`textareaClass`/`selectClass` (Field.tsx:43-49).
- Validasi utama di server (Zod, `safeParse` → 400 `{ error, details }`); klien menampilkan `data.error` sebagai state error form ("Gagal menyimpan") (src/app/admin/faq/page.tsx:75-76).
- Umpan balik hasil: `swalSuccess` saat tersimpan/terhapus, `swalError` saat gagal, `swalConfirm` sebelum hapus (src/app/admin/faq/page.tsx:80-89; util src/lib/swal.ts).
- Pengumuman memakai halaman penuh (bukan modal): `tambah/` dan `[id]/edit/` berbagi `_form/PengumumanForm.tsx` dengan RichTextEditor.
- Login admin: form client + konfigurasi reCAPTCHA dari /api/auth/login-config; error rate-limit/kredensial dari API (src/app/admin/login/page.tsx, src/app/api/auth/login/route.ts:30-46).
- **Tidak ada form publik yang submit ke server** — grep `fetch(` di src/components/public/*.tsx nihil; KalkulatorForm murni kalkulasi client-side dari data yang dioper landing page sebagai props.

## 5. Status Responsif per Halaman

Penilaian dari keberadaan kelas breakpoint Tailwind (`sm:`/`md:`/`lg:`) dan mekanisme mobile; belum diuji render aktual.

| Halaman | Status | Bukti |
|---|---|---|
| `/` landing | mobile-ready | Kelas breakpoint di page.tsx (4) dan komponen section-nya (Hero 3, Footer 3, JadwalHighlights 3, KalkulatorForm 8, Navbar 5 + menu mobile) |
| `/pengumuman`, `/pengumuman/[slug]`, `/kontak` | mobile-ready | Layout container sederhana + breakpoint (1-2 per file) + Navbar/Footer responsif |
| 5 halaman redirect | n/a | Hanya permanentRedirect |
| `/admin/login` | mobile-ready | 5 kelas breakpoint (src/app/admin/login/page.tsx) |
| Kerangka admin (Sidebar/Topbar) | mobile-ready | Sidebar = drawer mobile: `fixed inset-y-0 ... md:relative md:translate-x-0` + overlay `md:hidden` (src/components/admin/Sidebar.tsx:71,95; AdminShell.tsx:21) |
| `/admin` dashboard | mobile-ready | 11 kelas breakpoint + `overflow-x-auto` (src/app/admin/page.tsx) |
| `/admin/biaya`, `/admin/jadwal`, `/admin/log-aktivitas` | mobile-ready | Tabel dibungkus `overflow-x-auto` (hasil grep) |
| `/admin/{dokumen, fakultas, faq, jalur-seleksi, jenjang, kelas, pengguna, pengumuman, program-studi}` (9 halaman bertabel) | tidak jelas | Bertabel tapi TANPA `overflow-x-auto`; kelas breakpoint minim (mis. faq 2) — perilaku tabel lebar di layar sempit perlu uji manual |
| `/admin/{halaman, pengaturan, popup}` | tidak jelas | Form panjang, kelas breakpoint minim; perlu uji manual |

Tidak ada halaman yang secara eksplisit desktop-only (tidak ditemukan gate lebar layar minimum di kode).
