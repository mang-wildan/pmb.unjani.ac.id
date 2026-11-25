# PMB UNJANI v2.0.0 — TODO

Pelacakan task dari `SPEC.md`. Ledger status/putusan: `PROGRESS.md`. Referensi visual: `preview/*.png`.

Siklus tiap task: tulis assert di `scripts/check-v2.mjs` → `node scripts/check-v2.mjs <n>` GAGAL → perubahan minimal → LULUS → cek manual browser (bila visual) → commit hanya path milik task.

## Task 1: Routing — redirect, sitemap, hapus halaman
- [x] Buat `scripts/check-v2.mjs` (node:assert builtin) + assert Task 1 (import default `next.config.mjs` sebagai OBJECT, panggil `.redirects()`)
- [x] Assert gagal
- [x] `next.config.mjs`: tabel redirect SPEC Task 1 (tuple seragam, satu hop, `/id/` + `/en/`, alias WordPress langsung ke anchor)
- [x] `src/app/sitemap.ts`: hapus `/jalur-masuk`, `/biaya-kuliah`
- [x] Hapus `src/app/[locale]/(public)/jalur-masuk/` dan `biaya-kuliah/`
- [x] Assert lulus; commit `0ebf540`; review spec + quality lulus

## Task 2: Font, token, Navbar, Footer
- [x] Assert Task 2 (teks sumber: `Montserrat` di `src/app/layout.tsx`, nilai warna di `tailwind.config.ts`, href anchor Navbar/Footer) gagal
- [x] `src/app/layout.tsx`: Montserrat via `next/font/google` (`--font-display`), Inter tetap
- [x] `tailwind.config.ts`: ganti nilai palet, kunci shade tetap, radius global tidak diubah
- [x] `Navbar.tsx`: anchor `/#jalur-seleksi`, `/#kalkulator`; CTA gold `rounded-lg`; transparan di atas hero → solid saat scroll; a11y + reduced motion
- [x] `Footer.tsx`: bg `#06281D`, teks putih, email gold, link anchor
- [x] Assert lulus; commit `c36cb4a` + fix minor `2d86c8a`; re-review APPROVED (0 temuan)

## Task 3: Beranda
- [x] Assert Task 3 (section id + `scroll-mt-24`, InstagramFeed/LandingPopup tetap diimpor, empty state kalkulator tetap bersyarat `records.length === 0`) gagal
- [x] Hero 900px desktop (mobile mengikuti isi), data dari PageContent/Jadwal/count DB
- [x] Dokumen aside/list, Jalur aside, Jadwal wide, Kalkulator band hijau (form tetap), Fakultas grid + kartu count gold, Pengumuman+Artikel combo, FAQ tab kategori, CTA gold
- [x] Assert lulus; commit `ce5bede` + fix `a2b7445`, `f7d7eb1`; re-review APPROVED (kontras disclaimer 8.24:1, assert mutation-verified)

## Task 4: Kontak
- [x] Assert gagal → `kontak/page.tsx` hero band + 2 kolom + FAQ preview (data Settings/FAQ) → lulus
- [x] Cek manual vs `variant-02-kontak-*.png`; commit `9e9cef6` + fix `487b9a7`; re-review APPROVED (0 temuan)

## Task 5: Pengumuman list & detail
- [x] Assert gagal → list (pinned card, badge tanggal, pager) + detail (hero 520px, konten + sidebar CTA/lainnya) → lulus
- [x] Cek manual vs `variant-02-pengumuman*.png`; commit `3cc674e`; review spec PASS + quality APPROVE (0 critical/important)

## Task 6: Artikel list & detail
- [x] Assert gagal → list (hero, cari/filter dari data, featured + grid) + detail editorial satu kolom, cover inline, tanpa hero foto → lulus
- [x] Cek manual vs `variant-02-artikel*.png`; commit `4d83673` + fix `03daac0`; re-review APPROVE (0 temuan baru)

## Task 7: Login admin
- [x] Assert gagal (markup split) + assert penjaga auth (`grecaptcha`, `captchaRequired`, `safeNextPath`, `setLoading`, `langkah`, `/api/auth/login` tetap ada)
- [x] Ubah markup saja; logic auth tidak berubah
- [x] Assert lulus; commit `c38353c` + guard `d5ef8bd`, `8590314`; re-review APPROVE (0 critical/important)

## Task 8: Verifikasi global
- [x] `node scripts/check-v2.mjs all` lulus
- [x] `yarn lint` lulus (0 error, 17 warning baseline; ignore backup + tooling)
- [x] `yarn build` lulus (27.5s, route lama hilang)
- [x] Manual: anchor + redirect 17 rule 1 hop 308, smooth scroll 96px offset, reduced motion, keyboard, mobile 375/390/1440
- [x] Commit perbaikan kalkulator kontras + i18n (`21a3e52`, `f2785ba`), lint ignore (`0eb5a68`, `0d5a4b9`)

## Task 9 (tambahan user)
- [x] Perbarui `docs/ARCHITECTURE.md`: versi 2.0.0, port 9532, Next 16.3.8, route publik tanpa `/jalur-masuk` & `/biaya-kuliah`, redirect ke anchor, font Montserrat/Inter

## Task 9: Rilis
- [x] `git tag --list` (cek tag existing) — kosong, belum ada tag
- [x] `package.json` version `2.0.0` (sudah)
- [x] `CHANGELOG.md`: entri `[2.0.0]`
- [x] Commit changelog `eeeae8f`
- [ ] STOP: minta konfirmasi user sebelum `git tag`, push branch, merge ke `main`, atau GitHub Release. Jangan `git push --tags`.

---

**Metode eksekusi:** Subagent-driven, implementer + reviewer per task (disetujui user).
