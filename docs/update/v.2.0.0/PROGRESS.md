# PMB UNJANI v2.0.0 — Progress & Preflight Ledger

Ledger pelacakan status, preflight, relasi file bersama (shared files), dan putusan teknis (rulings) untuk rilis v2.0.0 Redesign Varian 02 Gold & Pembenahan Routing.

---

## 1. Metadata Proyek & Branch

- **Base Commit**: `9e08148` (docs(rilis): T.4.2 Rich Results Test artikel dan pengumuman valid)
- **Branch Aktif**: `release/v2.0.0`
- **Target Versi**: `2.0.0` (`package.json:3`)
- **Status Sesi**: Persiapan Selesai (Spesifikasi & Dokumen Rencana Dikoreksi; Aplikasi Belum Diimplementasi)
- **Metode Eksekusi Disetujui**: Subagent-driven (implementer + reviewer per task) dengan TDD script builtin `node:assert` (`scripts/check-v2.mjs`) tanpa dependensi tambahan.
- **Referensi Desain Utama**: `docs/update/v.2.0.0/preview/*.png` (Varian 02 Gold FigCraft), bukan file temporary.

---

## 2. Invarian & Putusan Teknis (Rulings)

1. **Routing & Redirects (MustBeFixed.txt)**:
   - URL `/jalur-masuk` dan `/biaya-kuliah` (beserta varian `/en/` dan `/id/`) dialihkan permanen (308) langsung ke anchor beranda: `/#jalur-seleksi` dan `/#kalkulator`.
   - Seluruh alias lama WordPress (`/semuajalur`, `/jalur-lanjutan`, `/jalur-pmdk-3`, `/jalur-magister`, `/infomasi-biaya`, `/biaya-pendidikan`) dialihkan LANGSUNG ke anchor tujuan akhir tanpa redirect berantai (no chaining hops).
   - Bentuk array redirect di `next.config.mjs` harus konsisten (menggunakan tuple array `[source, destination]` yang seragam di-map, tanpa mencampur objek mentah).
   - Routing `next-intl` menggunakan `localePrefix: 'as-needed'`; akses eksplisit `/id/*` dilayani dengan aman.
   - Sitemap `src/app/sitemap.ts` menghapus rute statis `/jalur-masuk` dan `/biaya-kuliah`.
   - File fisik halaman `src/app/[locale]/(public)/jalur-masuk/page.tsx` dan `src/app/[locale]/(public)/biaya-kuliah/page.tsx` dihapus.

2. **Tipografi & Desain Token (Varian 02 Gold)**:
   - Font heading display: **Montserrat** asli melalui `next/font/google` di `src/app/layout.tsx`, bukan fallback Plus Jakarta Sans.
   - Font body: **Inter** melalui `next/font/google`.
   - Radius elemen publik: kartu dan tombol **8px** (`rounded-lg`), **BUKAN 20px / `rounded-2xl`**. Config radius global tidak diubah agar admin aman.
   - Redirect `en` ke `/en#anchor` (bukan `/en/#anchor`) untuk menghindari hop trailing-slash.
   - Warna utama: Primary Green `#063F2A`, Accent Gold `#D4AF37`, Text on Gold `#1D2114`, Footer BG `#06281D`, Surface `#FFFFFF`, Ink `#10281D`, Ink Muted `#576B5F`.
   - Tema global pada `tailwind.config.ts` tidak boleh merusak komponen CMS admin (`AdminShell`, `Field`, `ModalShell`, dll.).

3. **Tata Letak & Konsistensi Visual (Preview PNG)**:
   - **Navbar**: Transparan di atas banner hero pada halaman ber-hero, tanpa duplikasi elemen navigasi, kontras teks terjaga, mendukung navigasi keyboard.
   - **Dokumen Resmi**: Layout **aside/list** (kolom kiri teks judul/deskripsi, kolom kanan daftar kartu vertikal PDF), **BUKAN 2 panel kartu side-by-side**.
   - **Artikel Detail**: Layout **single-column centered editorial** dengan cover image di tengah badan konten, **BUKAN 2 kolom sidebar** dan **BUKAN foto background hero di belakang header**.
   - **Pengumuman Detail**: Layout dua kolom (kiri konten + kotak jadwal + dokumen unduhan; kanan sidebar kartu CTA gold + pengumuman lainnya).
   - **Kalkulator Biaya**: Diletakkan dalam container solid primary green band (`#063F2A`). Tampilan empty state ("Biaya pendidikan sedang disusun") pada preview hanya muncul jika data biaya kosong; jika data biaya tersedia di DB, form kalkulator interaktif tetap ditampilkan penuh.
   - **Fitur Existing Dipertahankan**: `InstagramFeed`, `LandingPopup`, `WhatsAppFloatingButton`, dan `DaftarFloatingButton` tetap aktif.

4. **Integritas Autentikasi Admin**:
   - Redesign halaman `src/app/admin/login/page.tsx` (split layout desktop dengan hero render kampus + kartu fitur di kiri) **WAJIB mempertahankan seluruh alur autentikasi existing**: reCAPTCHA dinamis, multi-langkah MFA (`kredensial`, `kode`, `daftar`, `pemulihan`, `info-pemulihan`), validasi error, loading state, safe redirect (`safeNextPath`). Catatan: per base `9e08148` tidak ada fitur "remember" di login (grep nihil); checkbox "Ingat saya" di PNG tidak ditambahkan tanpa perilaku nyata — perlu keputusan user.

5. **Integritas CMS (No Hardcoded Content)**:
   - Seluruh data jadwal, gelombang aktif, jumlah fakultas (11), jumlah program studi (48), jalur pendaftaran, persyaratan jalur, pengumuman, artikel, dan FAQ harus diambil secara dinamis dari Mongoose model / CMS, bukan teks statis hardcoded di JSX.

6. **Pengujian & Verifikasi (TDD)**:
   - Dilarang membuat test palsu yang mengimpor library yang tidak terpasang (`@testing-library/*`).
   - Seluruh pengujian otomatis dijalankan menggunakan script Node.js builtin: `scripts/check-v2.mjs` berbasis `node:assert/strict`.
   - Script assert hanya memverifikasi kontrak kode, konfigurasi, ekspor, dan struktur JSX. Pengujian visual (rendering pixel, responsivitas breakpoint, smooth scroll) dilakukan secara terpisah melalui browser manual.
   - Setiap task dijalankan dengan siklus: Test fail first -> Implementasi perubahan minimal -> Test pass -> Commit hanya file milik task.

7. **Prosedur Rilis (Task 9)**:
   - Cek tag git existing (belum ada tag sebelumnya).
   - Verifikasi nomor versi `2.0.0` pada `package.json` dan pembaruan `CHANGELOG.md`.
   - Dilarang menjalankan `git push --tags` atau push ke remote secara sepihak tanpa konfirmasi eksplisit pengguna setelah seluruh verifikasi selesai.

---

## 3. Preflight Table per Task

| Task | Nama Task | Status | Target File Eksak | Dependensi / Shared Files | Kriteria Selesai & Script Uji |
|---|---|---|---|---|---|
| **Task 1** | Routing Fix, Redirects, Sitemap & Hapus Halaman | Siap | `next.config.mjs`, `src/app/sitemap.ts`, `src/app/[locale]/(public)/jalur-masuk/page.tsx` (delete), `src/app/[locale]/(public)/biaya-kuliah/page.tsx` (delete) | `next.config.mjs` | Redirect tuple lengkap tanpa chain, sitemap bersih, page dihapus. Uji: `node scripts/check-v2.mjs 1` |
| **Task 2** | Desain Token, Font Montserrat, Nav & Footer | Siap | `src/app/layout.tsx`, `tailwind.config.ts`, `src/components/public/Navbar.tsx`, `src/components/public/Footer.tsx` | `tailwind.config.ts`, `src/app/layout.tsx` | Montserrat via `next/font`, token Varian 02 Gold, radius 8px, nav/footer anchor links. Uji: `node scripts/check-v2.mjs 2` |
| **Task 3** | Redesign Landing Page (Beranda) | Siap | `src/app/[locale]/(public)/page.tsx`, `src/components/public/Hero.tsx`, `DokumenList.tsx`, `JalurList.tsx`, `JalurAccordion.tsx`, `JadwalHighlights.tsx`, `KalkulatorForm.tsx`, `ProgramStudiExplorer.tsx`, `PengumumanList.tsx`, `ArtikelSection.tsx`, `FAQAccordion.tsx` | `page.tsx`, DokumenList, JalurList, KalkulatorForm | Section IDs lengkap (`#jalur-seleksi`, `#kalkulator`, dll.) + `scroll-mt-24`, hero 900px, aside dokumen, kalkulator primary band, data dinamis CMS. Uji: `node scripts/check-v2.mjs 3` |
| **Task 4** | Redesign Halaman Kontak | Siap | `src/app/[locale]/(public)/kontak/page.tsx` | `kontak/page.tsx` | Hero band 480px/440px, breadcrumb, 2 kolom (Sekretariat & Kanal Resmi), FAQ preview 3 item. Uji: `node scripts/check-v2.mjs 4` |
| **Task 5** | Redesign Pengumuman (List & Detail) | Siap | `src/app/[locale]/(public)/pengumuman/page.tsx`, `src/app/[locale]/(public)/pengumuman/[slug]/page.tsx` | `pengumuman/page.tsx` | List: hero 480px, pinned card, date badges. Detail: hero 520px, 2 kolom (konten + sidebar CTA & pengumuman lain). Uji: `node scripts/check-v2.mjs 5` |
| **Task 6** | Redesign Artikel (List & Detail Editorial) | Siap | `src/app/[locale]/(public)/artikel/page.tsx`, `src/app/[locale]/(public)/artikel/[slug]/page.tsx` | `artikel/page.tsx` | List: hero 480px, search + filter, grid 3. Detail: single-column centered editorial, cover image inline, quote gold, related grid. Uji: `node scripts/check-v2.mjs 6` |
| **Task 7** | Redesign Admin Login Split Screen | Siap | `src/app/admin/login/page.tsx` | `admin/login/page.tsx` | Desktop split screen (hero render 3D + fitur di kiri, form di kanan). Fitur auth (recaptcha, loading, mfa, error, safeNextPath) 100% utuh. Uji: `node scripts/check-v2.mjs 7` |
| **Task 8** | Verifikasi Global, Smooth Scroll & Build | Siap | `src/styles/globals.css`, seluruh komponen publik | Shared global styles & build | Build `yarn build` sukses, lint `yarn lint` sukses, audit TDD pass, verifikasi reduced-motion & smooth scroll. Uji: `node scripts/check-v2.mjs 8` |
| **Task 9** | Persiapan Rilis v2.0.0 & Changelog | Siap | `CHANGELOG.md`, `package.json` | `CHANGELOG.md` | Catatan rilis v2.0.0 lengkap di CHANGELOG.md, version 2.0.0. Push & tag menunggu konfirmasi user. Uji: `node scripts/check-v2.mjs 9` |

---

## 4. Matriks File Bersama (Shared Files Matrix)

Untuk mencegah tumpang tindih dan regresi saat eksekusi:

| File Bersama | Task yang Mengakses | Aturan & Batasan |
|---|---|---|
| `next.config.mjs` | Task 1 | Format redirects wajib array tuple yang seragam dimap ke object redirect; jangan ada mixed object mentah. |
| `src/app/layout.tsx` | Task 2, Task 8 | Ganti Plus_Jakarta_Sans dengan Montserrat asli dari `next/font/google`. Variabel CSS font `--font-display` tetap dipertahankan. |
| `tailwind.config.ts` | Task 2, Task 8 | Perbarui nilai palet brand, accent, ink; kunci shade tetap; `borderRadius` global tidak diubah (8px publik via `rounded-lg`). |
| `src/app/[locale]/(public)/page.tsx` | Task 3 | Mengintegrasikan seluruh section landing page dengan id anchor dan offset `scroll-mt-24`. Jangan menghilangkan komponen popup dan instagram. |
| `src/styles/globals.css` | Task 2, Task 8 | Pastikan aturan smooth scroll menghormati `@media (prefers-reduced-motion: reduce)`. |
| `src/app/admin/login/page.tsx` | Task 7 | Redesign markup/CSS saja; seluruh state, hook, dan alur API login dilarang diubah perilakunya. |

---

## 5. Log Eksekusi

- Task 2: implementasi `c36cb4a`; review spec PASS with minor deviation, quality APPROVE WITH NITS (0 Critical/Important, 2 Minor).
- Task 2: complete (commits `0ebf540..2d86c8a`, initial review + fix re-review clean APPROVED).
- Task 3: BASE `2d86c8a`, dispatch implementer.
- Task 3: implementasi `ce5bede`; review spec belum lulus, quality minta perubahan (0 Critical / 2 Important / 4 Minor). Fix round 1/5 berjalan: kontras hasil kalkulator, drill-down prodi mobile, key HeroGelombangInfo, panel jalur mobile, copy kalkulator ke messages.
- Task 3: minor (deferred): posisi heading jalur desktop di kolom kiri seperti PNG.
- Task 3: minor (deferred): badge tanggal pengumuman dipisah hari besar + bulan/tahun.
- Task 3: minor (deferred): label field & aria-label kalkulator masih bahasa Indonesia (dibawa ke final review).
- Task 3: fix round 1 `a2b7445` (I2/M1/M2/M4 ADDRESSED, I1 PARTIAL); fix round 2 `f7d7eb1` (disclaimer `text-white/80` 11.99:1, assert eksak + mutation check, plural EN). Re-review round 2 APPROVE.
- Task 3: complete (commits `2d86c8a..f7d7eb1`; 2 Important + 4 Minor addressed/deferred).
- Task 4: BASE `f7d7eb1`, dispatch implementer.
- Task 4: implementer NEEDS_CONTEXT (form kontak tidak ada di SPEC/PNG); klarifikasi dikirim: tanpa form, edit messages id/en diizinkan.
- Task 4: implementasi `9e9cef6`; review spec PASS, quality REQUEST EVIDENCE/MINORS (0 Critical / 2 Important runtime evidence / 6 Minor).
- Task 4: verifikasi runtime CDP (mobile emulation 390px + desktop pasca-hidrasi) & perbaikan minor (M1-M6) berjalan di round 1. Belum `[x]`.
- Task 4: fix round 1 `487b9a7` — I1/I2 bukti CDP terverifikasi (scrollWidth==innerWidth, navbar putih pasca-hidrasi), M1–M6 ADDRESSED. Re-review APPROVE, 0 temuan. Task 4 complete (`f7d7eb1..487b9a7`).
- Task 5: BASE `487b9a7`, dispatch implementer.
- Task 5: implementasi `3cc674e`; review spec PASS + quality APPROVE (0 Critical/Important, 3 Minor). Task 5 complete (`487b9a7..3cc674e`).
- Task 5: minor (deferred): cakupan assert detail belum lengkap; link eksternal tanpa indikasi + alt duplikat kartu highlight. Review visual independen belum melihat piksel; bukti runtime implementer tersedia, cek final tetap diperlukan.
- Task 5 ruling: usulan ekstrak PageHero tidak dikerjakan otomatis; duplikasi markup kecil bukan alasan abstraksi/refactor di luar scope.
- Task 6: BASE `3cc674e`, dispatch implementer.
- Task 6: implementasi `4d83673`; review spec PASS, quality PASS with notes (0 Critical / 1 Important / 6 Minor). Fix `03daac0`: tag chips mobile scroll/nowrap + landmark nav, re-review APPROVE (0 temuan baru). Task 6 complete.
- Task 6: minor (deferred): query related artikel ganda; tidak direfactor otomatis karena di luar perbaikan wajib.
- Task 7: BASE `03daac0`, dispatch implementer.
- Task 7: implementasi `c38353c`; review spec PASS conditional, quality REQUEST CHANGES (0 Critical / 1 Important / 2 Minor). Finding I1: hash guard melewatkan wiring JSX (onSubmit, required, captcha ref, captcha condition). Fix round 1/5 berjalan.
- Task 7: minor (deferred/reported): testing limitation kredensial riil dinyatakan eksplisit; M2 skala tipografi opsional. Belum `[x]`.
- Task 7: fix `d5ef8bd` (wiring JSX + 6 negative controls) dan `8590314` (info-pemulihan callback + 3 negative controls). Re-review APPROVE (0 Critical/Important). Task 7 complete (`03daac0..8590314`).
- Task 7: auth end-to-end sukses + MFA dengan kredensial riil TIDAK diuji (tidak ada kredensial, dilarang di repo). Guard source memastikan logika/wiring tak berubah.
- Task 8: BASE `8590314`, mulai verifikasi global (check all, lint, build, manual browser).
- Task 8: fix `85c2bd3` (kontras stepper), `0b2704c` (label i18n); build HEAD `0b2704c` exit 0, route lama hilang, 17 redirect satu hop 308, anchor offset 96px, tanpa overflow 375/390/1440. Review: 3 Blocker / 2 Important / 2 Minor.
- Task 8: fix `21a3e52` + `f2785ba`: guard kontras tolak `text-ink-soft`, binding i18n dikunci + negative control, 17 key kalkulator id/en.
- Lint: `0eb5a68` ignore backup, `0d5a4b9` ignore `.agents/**` (disetujui user). `yarn lint` exit 0: 0 error, 17 warning = baseline `9e08148`. `yarn build` HEAD exit 0. Task 8 complete.
- Task 9: `docs/ARCHITECTURE.md` + `CHANGELOG.md` [2.0.0] di `eeeae8f`. Tag belum ada. Final whole-branch review dijalankan sebelum minta konfirmasi tag/push/merge.
- Keputusan user (20 Nov 2026): (1) tambah `node_modules-windows-backup/**` ke ignore eslint, folder tidak dihapus; (2) 17 warning eslint dibandingkan dengan baseline `9e08148`, hanya warning baru yang diperbaiki; (3) admin terautentikasi tidak diuji runtime, dicatat sebagai limitation rilis.
- Task 6: minor (deferred): regex helper rapuh; magic `1_000_000` waktu baca; tipe duplikat; featured muncul di halaman 2+; normalisasi tag campur huruf.
- Task 3: minor (deferred): step-counter `text-ink-soft/60` kontras ~2:1 (pra-eksis); `aria-live` + focus ganda di JalurAccordion; rail prodi 768–1023px tidak auto-scroll.
- Catatan luar scope: warning rasio logo di Navbar; error `preview/Gallery` bukan dari Task 3.
- Lint: `eslint .` OOM exit 134 karena `node_modules-windows-backup/**` (kondisi lingkungan, bukan regresi). Verifikasi lint pakai daftar path spesifik `eslint src scripts`.
- Kontrak integrasi Task 3–6: hero paling atas wajib `data-public-hero`, mulai y=0, padding konten atas minimal 96px; satu Navbar fixed 80px. Tanpa marker fallback solid. Artikel detail editorial menggunakan header solid hijau gelap.
- Task 8: admin terautentikasi belum diuji (tidak ada kredensial); browser checks Task 2 bukan klaim pixel parity.

- Commit `180c81d`: koreksi SPEC/TODO + ledger.
- Commit `bc504bb`: MustBeFixed.txt + preview PNG dilacak git (sebelumnya concern #6).
- Ruling: checkbox "Ingat saya" TIDAK ditambahkan di login — fitur remember tidak ada di auth dan AGENTS.md melarang ubah config auth — biaya bila salah: fitur auth terpisah nanti.
- Ruling: script `task-brief` gagal di bash Windows (`pipefail`); brief = bagian Task N di SPEC.md.
- Ruling: concern AGENTS.md/ARCHITECTURE.md basi (versi/port) hanya dilaporkan, tidak diubah (di luar scope).
- Task 1: BASE `bc504bb`, implementer menghasilkan commit `0ebf540`; review independen LULUS (spec + quality; 0 temuan). Task 1 complete, range `bc504bb..0ebf540`.
- Task 1 verifikasi: assert routing PASS; `npx tsc --noEmit` PASS; lint file task PASS. `yarn lint` global exit 1 (41.759 error, 84.064 warning), ikut memindai `node_modules-windows-backup`. Baseline BASE belum diverifikasi; jangan menyebut semua temuan pra-eksis. Tidak mengubah eslint ignore atau menghapus backup.
- Keputusan user: setuju seluruh ruling di atas. Di akhir (Task 9, sebelum tag) perbarui `docs/ARCHITECTURE.md`: versi 2.0.0, port 9532, Next 16.3.8, daftar route publik tanpa `/jalur-masuk` & `/biaya-kuliah`, tabel redirect ke anchor, font Montserrat/Inter.
