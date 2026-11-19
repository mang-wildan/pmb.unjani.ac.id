# PMB UNJANI v2.0.0 — TODO

Pelacakan task dari `SPEC.md`. Ledger status/putusan: `PROGRESS.md`. Referensi visual: `preview/*.png`.

Siklus tiap task: tulis assert di `scripts/check-v2.mjs` → `node scripts/check-v2.mjs <n>` GAGAL → perubahan minimal → LULUS → cek manual browser (bila visual) → commit hanya path milik task.

## Task 1: Routing — redirect, sitemap, hapus halaman
- [ ] Buat `scripts/check-v2.mjs` (node:assert builtin) + assert Task 1 (import default `next.config.mjs` sebagai OBJECT, panggil `.redirects()`)
- [ ] Assert gagal
- [ ] `next.config.mjs`: tabel redirect SPEC Task 1 (tuple seragam, satu hop, `/id/` + `/en/`, alias WordPress langsung ke anchor)
- [ ] `src/app/sitemap.ts`: hapus `/jalur-masuk`, `/biaya-kuliah`
- [ ] Hapus `src/app/[locale]/(public)/jalur-masuk/` dan `biaya-kuliah/`
- [ ] Assert lulus; commit

## Task 2: Font, token, Navbar, Footer
- [ ] Assert Task 2 (teks sumber: `Montserrat` di `src/app/layout.tsx`, nilai warna di `tailwind.config.ts`, href anchor Navbar/Footer) gagal
- [ ] `src/app/layout.tsx`: Montserrat via `next/font/google` (`--font-display`), Inter tetap
- [ ] `tailwind.config.ts`: ganti nilai palet, kunci shade tetap, radius global tidak diubah
- [ ] `Navbar.tsx`: anchor `/#jalur-seleksi`, `/#kalkulator`; CTA gold `rounded-lg`; transparan di atas hero → solid saat scroll; a11y + reduced motion
- [ ] `Footer.tsx`: bg `#06281D`, teks putih, email gold, link anchor
- [ ] Assert lulus; cek manual admin tidak rusak; commit

## Task 3: Beranda
- [ ] Assert Task 3 (section id + `scroll-mt-24`, InstagramFeed/LandingPopup tetap diimpor, empty state kalkulator tetap bersyarat `records.length === 0`) gagal
- [ ] Hero 900/1100px, data dari PageContent/Jadwal/count DB
- [ ] Dokumen aside/list, Jalur aside, Jadwal wide, Kalkulator band hijau (form tetap), Fakultas grid + kartu count gold, Pengumuman+Artikel combo, FAQ tab kategori, CTA gold
- [ ] Assert lulus; cek manual vs `variant-02.png` / `variant-02-mobile.png`; commit

## Task 4: Kontak
- [ ] Assert gagal → `kontak/page.tsx` hero band + 2 kolom + FAQ preview (data Settings/FAQ) → lulus
- [ ] Cek manual vs `variant-02-kontak-*.png`; commit

## Task 5: Pengumuman list & detail
- [ ] Assert gagal → list (pinned card, badge tanggal, pager) + detail (hero 520px, konten + sidebar CTA/lainnya) → lulus
- [ ] Cek manual vs `variant-02-pengumuman*.png`; commit

## Task 6: Artikel list & detail
- [ ] Assert gagal → list (hero, cari/filter dari data, featured + grid) + detail editorial satu kolom, cover inline, tanpa hero foto → lulus
- [ ] Cek manual vs `variant-02-artikel*.png`; commit

## Task 7: Login admin
- [ ] Assert gagal (markup split) + assert penjaga auth (`grecaptcha`, `captchaRequired`, `safeNextPath`, `setLoading`, `langkah`, `/api/auth/login` tetap ada)
- [ ] Ubah markup saja; logic auth tidak berubah
- [ ] Assert lulus; uji manual login + MFA + captcha + redirect `next`; commit

## Task 8: Verifikasi global
- [ ] `node scripts/check-v2.mjs all` lulus
- [ ] `yarn lint` lulus
- [ ] `yarn build` lulus
- [ ] Manual: anchor + redirect URL lama, smooth scroll, reduced motion, keyboard nav, mobile 375px, admin pages
- [ ] Commit perbaikan bila ada (path spesifik, bukan `git add -A`)

## Task 9: Rilis
- [ ] `git tag --list` (cek tag existing)
- [ ] `package.json` version `2.0.0` (sudah)
- [ ] `CHANGELOG.md`: entri `[2.0.0]`
- [ ] Commit changelog
- [ ] STOP: minta konfirmasi user sebelum `git tag`, push branch, merge ke `main`, atau GitHub Release. Jangan `git push --tags`.

---

**Metode eksekusi:** Native, per task (disetujui user).
