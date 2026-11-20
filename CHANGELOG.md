# Changelog

Semua perubahan penting pada proyek ini dicatat di file ini.

Format berdasarkan [Keep a Changelog](https://keepachangelog.com/id-ID/1.1.0/).

## [Unreleased]

## [2.0.0] — 2026-11-20

Redesign Varian 02 "Cinematic Hijau" (Gold) untuk situs publik dan halaman login admin, plus pembenahan routing.

### Added
- Token desain Varian 02: hijau `#063F2A`, gold `#D4AF37`, palet latar/garis, radius 8px untuk kartu dan tombol publik.
- Font judul Montserrat via `next/font/google` (`--font-display`); Inter tetap untuk body.
- `scripts/check-v2.mjs`: pemeriksa berbasis `node:assert` untuk redirect, token, navigasi, i18n, kontras, dan penjaga wiring login admin.

### Changed
- Beranda: hero sinematik full-bleed (900px desktop, 1100px mobile), seksi Jalur Seleksi, Jadwal, Dokumen, Kalkulator, Fakultas, Pengumuman+Artikel, FAQ, banner CTA gold.
- Halaman Kontak: hero band, dua kartu (Sekretariat PMB dan Kanal Resmi), preview FAQ; nilai kontak dari Settings.
- Halaman Pengumuman: kartu pinned, daftar dengan badge tanggal, detail dengan sidebar gold.
- Halaman Artikel: list dengan pencarian/kategori/tag dari data, kartu unggulan, grid; detail editorial satu kolom.
- Login admin: tata letak split foto kampus + panel branding; logika auth tidak berubah.
- Navbar publik: satu instance fixed, transparan di atas hero lalu solid saat scroll; anchor `#jalur-seleksi` dan `#kalkulator`.
- Footer: hijau gelap, tautan anchor.
- Kalkulator biaya: label dan aria-label dipindahkan ke kamus id/en; kontras teks lolos WCAG AA.

### Removed
- Halaman mandiri `/jalur-masuk` dan `/biaya-kuliah`. Keduanya sekarang dialihkan permanen (308, satu hop) ke bagian beranda; entri sitemap dihapus.

### Fixed
- Tautan navbar/footer mengarah ke anchor beranda, bukan halaman terpisah.
- React key duplikat pada kartu gelombang jadwal.
- Kontras teks hasil dan disclaimer kalkulator di panel hijau gelap.
- Drill-down prodi di mobile yang menyisakan grid fakultas di atas panel hasil.

### Notes
- `yarn lint` mengabaikan folder `node_modules-windows-backup/**` dan `.agents/**` (tooling lokal); kode aplikasi tetap diperiksa. Hasil: 0 error, 17 warning yang sama dengan baseline.
- Uji login sukses dan MFA dengan kredensial nyata belum dilakukan (tanpa kredensial); halaman admin terautentikasi belum diverifikasi runtime.

## [1.2.0] — UNKNOWN

Nomor versi diambil dari `package.json:3`. Tanggal rilis dan rincian perubahan
versi ini UNKNOWN — perlu konfirmasi manual (folder proyek bukan repo git:
tidak ada `.git`, tag, maupun riwayat rilis; README.md dan BukuPanduan.md
tidak memuat riwayat versi).
