# TODO v1.3.0 — Papan Task Eksekusi

## Instruksi untuk agent pelaksana

1. Format baris: `[ ] ID | fase | deskripsi | file terdampak | butuh: <ID prasyarat> | agent: - | commit: -`. Kerjakan dari atas ke bawah; sebuah task BOLEH dikerjakan hanya bila semua ID di kolom `butuh` sudah `[x]`.
2. Satu task = satu commit (target ±150 baris perubahan). Kalau saat mengerjakan ternyata membengkak, BERHENTI dan pecah task-nya dulu di file ini.
3. Setelah task selesai: ubah `[ ]` menjadi `[x]`, isi kolom `agent:` (nama/sesi kamu) dan `commit:` (hash pendek). DILARANG mulai task berikutnya sebelum baris ini diperbarui.
4. Task verifikasi (deskripsi diawali "VERIFIKASI"/"CHECKPOINT") tidak menghasilkan commit kode — kolom commit diisi `-` dan bukti hasil uji dicatat di `RILIS-CHECKLIST.md`. Kalau verifikasi GAGAL: jangan lanjut; buka kembali task penyebabnya.
5. Tanda `[DB]` = menyentuh skema/koleksi database — baca PLAN.md bagian migrasi dulu. Tanda `[SEO-IRREVERSIBLE]` = efeknya permanen begitu terindeks mesin pencari — baca ROLLBACK.md §5 SEBELUM mengerjakan, dan pastikan gerbang/verifikasi prasyaratnya lulus.
6. Patuh AGENTS.md: dilarang menambah dependency, menyentuh .env, atau refactor di luar scope. Rincian isi tiap task ada di PLAN.md (rujuk nomor langkah A0–A8 / B0–B9). Fase B DILARANG dimulai sebelum T-20 `[x]`.
7. Keputusan pemilik 7 Agustus 2026: selesaikan implementasi lokal Fase A sebelum deployment aaPanel. Task verifikasi yang membutuhkan production/perangkat/GA boleh ditunda dan dilewati sementara, tetap `[ ]`, dan tidak dianggap lulus. T-20 tetap menjadi gerbang mutlak Fase B.

## FASE A — fondasi SEO (permukaan existing)

[x] T-00 | PRE | Bersihkan 2 error lint baseline pada skrip pembersih cache dev | scripts/clean-next-dev.js | butuh: - | agent: Codex | commit: cb30195
[x] T-01 | A | Buat RILIS-CHECKLIST.md + isi baseline production (canonical live, GA, redirect host, cache) — PLAN A0 | docs/update/v1.3.0/RILIS-CHECKLIST.md | butuh: - | agent: Codex | commit: 71d91f8
[x] T-02 | A | VERIFIKASI perilaku kesegaran sitemap production (terbitkan pengumuman uji → muncul/tidak tanpa rebuild); catat hasil | RILIS-CHECKLIST.md | butuh: T-01 | agent: Codex | commit: -
[x] T-03 | A | Tambah aset gambar OG default 1200×630 ≤300KB (FR-15) — aset production terverifikasi 200 | public/og-default.png | butuh: - | agent: Codex | commit: 7831733
[x] T-04 | A | VERIFIKASI og:image: buka URL gambar langsung + pratinjau WhatsApp beranda/kontak/pengumuman | - | butuh: T-03 | agent: Codex + pemilik produk | commit: -
[x] T-05 | A | [SEO-IRREVERSIBLE] Perluas buildMetadata: canonical per bahasa + hreflang id/en (FR-16) | src/lib/seo.ts | butuh: T-01 | agent: Codex | commit: ad080bb
[x] T-06 | A | Teruskan locale/path ke buildMetadata di 4 halaman publik; pastikan root layout tidak menimpa alternates | src/app/[locale]/(public)/{page,pengumuman/page,pengumuman/[slug]/page,kontak/page}.tsx, src/app/layout.tsx | butuh: T-05 | agent: Codex | commit: c3c03f1
[x] T-07 | A | VERIFIKASI metadata 8 kombinasi (4 halaman × id/en): hreflang saling menunjuk, canonical self; title/desc/OG identik baseline | - | butuh: T-06 | agent: Codex | commit: -
[x] T-08 | A | [SEO-IRREVERSIBLE] Sitemap: varian URL /en + mekanisme kesegaran eksplisit (FR-16 AC3, prasyarat FR-13) | src/app/sitemap.ts | butuh: T-05, T-02 | agent: Codex | commit: 034df0d
[x] T-09 | A | VERIFIKASI sitemap: URL /en ada; pengumuman uji baru masuk dalam jendela; entri lama utuh | - | butuh: T-08 | agent: Codex + pemilik produk | commit: -
[x] T-10 | A | Buat modul lib kompresi/resize gambar (pakai sharp existing) — PLAN A4 | src/lib/image.ts | butuh: - | agent: Codex | commit: b66c49b
[x] T-11 | A | Terapkan kompresi ≤300KB + route penyaji runtime yang disetujui pemilik | src/app/api/admin/hero-images/upload/route.ts, src/app/uploads/hero/[filename]/route.ts | butuh: T-10 | agent: Codex | commit: b22f979
[x] T-12 | A | VERIFIKASI hero: upload 2MB → tersaji ≤300KB; slider normal; hero lama tak tersentuh | - | butuh: T-11 | agent: Codex + pemilik produk | commit: -
[x] T-13 | A | Buat helper analytics fire-and-forget + daftar nama event (TBD-08) — PLAN A5 | src/lib/analytics.ts | butuh: - | agent: Codex | commit: 6eef340
[x] T-14 | A | Event klik CTA daftar: hero & tombol melayang, lokasi terbedakan (FR-17) — href TIDAK diubah | src/components/public/Hero.tsx, src/components/public/DaftarFloatingButton.tsx | butuh: T-13 | agent: Codex | commit: 89048e7
[x] T-15 | A | Event klik: WhatsApp, unduh dokumen, kalkulator (FR-17) | src/components/public/{WhatsAppFloatingButton,DokumenList,KalkulatorForm}.tsx | butuh: T-13 | agent: Codex | commit: 3b43828
[x] T-16 | A | UTM diteruskan ke URL pendaftaran saat klik CTA, sisi klien (FR-18) | src/components/public/Hero.tsx, src/components/public/DaftarFloatingButton.tsx | butuh: T-14 | agent: Codex | commit: 4ff3e69
[x] T-17 | A | VERIFIKASI CTA: klik tetap membuka pendaftaran dengan GA mati/diblokir/tanpa-utm; 5 event tampak di GA Realtime; utm ikut di URL tujuan | - | butuh: T-15, T-16 | agent: pemilik produk + Codex | commit: -
[x] T-18 | A | Singkatan fakultas/prodi anti-terjemahan + nama lengkap sebagai keterangan (FR-21) | src/components/public/FakultasProdiSection.tsx | butuh: - | agent: Codex | commit: b6980ab
[x] T-19 | A | VERIFIKASI singkatan: auto-translate ID→EN FEB tetap FEB; tooltip; screenshot sebelum-sesudah identik | - | butuh: T-18 | agent: pemilik produk + Codex | commit: -
[ ] T-20 | A | CHECKPOINT REGRESI FASE A: DIBUKA KEMBALI 10 Agustus 2026 karena canonical/sitemap deployment kembali memakai localhost | RILIS-CHECKLIST.md | butuh: T-04, T-07, T-09, T-12, T-17, T-19 | agent: pemilik produk + Codex | commit: -

## FASE B — modul artikel (aditif)

[x] T-21 | B | Gerbang keputusan: minta pemilik produk memutuskan TBD-02/05/06/07 (usulan default di PLAN B0); catat di SRS §11 | docs/update/v1.3.0/SRS.md | butuh: T-20 | agent: pemilik produk + Codex | commit: -
[x] T-22 | B | [DB] Model Artikel + fungsi kondisi layak-tampil publik (skema per SRS §5) | src/models/Artikel.ts | butuh: T-21 | agent: Codex | commit: -
[x] T-23 | B | [DB] Model KategoriArtikel | src/models/KategoriArtikel.ts | butuh: T-21 | agent: Codex | commit: -
[x] T-24 | B | VERIFIKASI model di dev: getIndexes lengkap; slug duplikat ditolak; fungsi layak-tampil menyaring draft/terjadwal/arsip/terhapus | - | butuh: T-22, T-23 | agent: Codex | commit: -
[x] T-25 | B | Menu Artikel & Kategori di ADMIN_NAV tanpa batasan roles (BUKAN di grup Master Data) + peta akses API | src/lib/permissions.ts | butuh: T-21 | agent: Codex | commit: -
[x] T-26 | B | VERIFIKASI akses: editor melihat menu baru; Master Data tetap tersembunyi; URL admin artikel oleh anonim → redirect login | - | butuh: T-25 | agent: Codex | commit: -
[x] T-27 | B | API artikel: daftar + buat (konvensi AGENTS: guard, zod, audit log) | src/app/api/admin/artikel/route.ts | butuh: T-24, T-26 | agent: Codex | commit: -
[x] T-28 | B | API artikel per-id: ubah + hapus-soft + cek kepemilikan editor | src/app/api/admin/artikel/[id]/route.ts | butuh: T-27 | agent: Codex | commit: -
[x] T-29 | B | API pulihkan artikel (kepemilikan sama) | src/app/api/admin/artikel/[id]/restore/route.ts | butuh: T-28 | agent: Codex | commit: -
[x] T-30 | B | API upload sampul: validasi konten + pipeline 16:9/≤1200px/≤300KB (FR-08) + route publik dinamis (keputusan pemilik, opsi 1) | src/app/api/admin/artikel/upload-sampul/route.ts, src/app/uploads/artikel/[filename]/route.ts | butuh: T-27 | agent: Codex | commit: -
[x] T-31 | B | API kategori artikel: CRUD + aturan hapus-terpakai per keputusan TBD-07 | src/app/api/admin/kategori-artikel/route.ts, src/app/api/admin/kategori-artikel/[id]/route.ts | butuh: T-24, T-26 | agent: Codex | commit: -
[x] T-32 | B | VERIFIKASI API: CRUD penuh; editor-A vs milik-B ditolak, admin lolos; soft delete menyisakan dokumen; audit log; sampul 4000×3000 → 16:9 ≤300KB; PDF menyamar .jpg ditolak | - | butuh: T-29, T-30, T-31 | agent: Codex | commit: -
[x] T-33 | B | Prop nonaktif-gambar RichTextEditor, default = perilaku sekarang (tempel/seret ikut mati saat nonaktif) | src/components/admin/RichTextEditor.tsx | butuh: T-21 | agent: Codex | commit: -
[x] T-34 | B | Halaman admin: daftar artikel (saring status + daftar terhapus + pulihkan) | src/app/admin/artikel/page.tsx | butuh: T-32 | agent: Codex | commit: -
[x] T-35a | B | Komponen form artikel: state, judul/_en, isi rich text tanpa gambar, kategori, dan tag | src/app/admin/artikel/_form/ArtikelForm.tsx | butuh: T-32, T-33 | agent: Codex | commit: -
[x] T-35b | B | Lengkapi form artikel: publikasi/jadwal, sampul, unggulan, metadata, dan submit | src/app/admin/artikel/_form/ArtikelForm.tsx | butuh: T-35a | agent: Codex | commit: -
[x] T-36 | B | Halaman tambah & edit artikel (memakai form bersama) | src/app/admin/artikel/tambah/page.tsx, src/app/admin/artikel/[id]/edit/page.tsx | butuh: T-35b | agent: Codex | commit: -
[x] T-37 | B | Halaman admin kategori artikel (pola modal FAQ) | src/app/admin/kategori-artikel/page.tsx | butuh: T-31 | agent: Codex | commit: -
[x] T-38 | B | VERIFIKASI alur admin penuh (draft→jadwal→terbit→arsip→hapus→pulihkan) + REGRESI: editor Pengumuman masih bisa sisip gambar | - | butuh: T-34, T-36, T-37 | agent: Codex | commit: -
[x] T-39 | B | Komponen kartu artikel: foto, judul, ringkasan-otomatis, penulis, tanggal | src/components/public/ArtikelCard.tsx | butuh: T-24 | agent: Codex | commit: -
[x] T-40 | B | Kunci i18n halaman/section artikel — id & en SELALU bersamaan | messages/id.json, messages/en.json | butuh: T-39 | agent: Codex | commit: -
[x] T-41 | B | Halaman indeks /artikel: SSR, 9/halaman, saring kategori & tag, cari judul (escape + batas panjang) | src/app/[locale]/(public)/artikel/page.tsx | butuh: T-39, T-40 | agent: Codex | commit: -
[x] T-42 | B | Halaman detail /artikel/[slug]: sanitasi isi, meta fallback/manual, JSON-LD artikel+breadcrumb, penulis seleksi-nama-saja, non-layak-tampil → 404 | src/app/[locale]/(public)/artikel/[slug]/page.tsx | butuh: T-39, T-40 | agent: Codex | commit: -
[x] T-43 | B | VERIFIKASI publik: view-source isi & meta; Rich Results lolos; email/role penulis TIDAK ada di source; pencarian simbol aneh aman; slug terhapus → 404 | - | butuh: T-41, T-42 | agent: Codex | commit: -
[x] T-44 | B | Section 3 kartu di landing, unggulan dulu, fail-soft (FR-09) | src/components/public/ArtikelSection.tsx, src/app/[locale]/(public)/page.tsx | butuh: T-43 | agent: Codex | commit: -
[x] T-45 | B | VERIFIKASI landing: 3 kartu + unggulan pertama; SEMUA section lain utuh; kasus artikel nol → landing tetap hidup | - | butuh: T-44 | agent: Codex | commit: -
[x] T-46 | B | [SEO-IRREVERSIBLE] Artikel layak-tampil masuk sitemap (+varian /en), keluar saat arsip/hapus (FR-13) | src/app/sitemap.ts | butuh: T-43 | agent: Codex | commit: -
[x] T-47 | B | VERIFIKASI sitemap artikel: masuk saat terbit, hilang saat arsip, /en ikut | - | butuh: T-46 | agent: Codex | commit: -
[x] T-48 | B | Event klik kartu artikel — event ke-6 (FR-17) | src/components/public/ArtikelCard.tsx | butuh: T-44 | agent: Codex | commit: -
[x] T-48A | B | KOREKSI DISETUJUI: Gambar OG artikel diunggah, bukan diketik sebagai path; kosong tetap fallback sampul | src/app/admin/artikel/_form/ArtikelForm.tsx, src/app/api/admin/artikel/upload-sampul/route.ts, SRS.md | butuh: T-48 | agent: Codex | commit: -
[x] T-48B | B | KOREKSI DISETUJUI: input tag Artikel berbentuk chip yang dapat dihapus, warna mengikuti brand | src/app/admin/artikel/_form/ArtikelForm.tsx, SRS.md | butuh: T-48A | agent: Codex | commit: -
[ ] T-49 | B | CHECKPOINT REGRESI FASE B + GERBANG RILIS: IMPACT.md §8 butir 1–18 penuh (desktop+ponsel) + RILIS-CHECKLIST final 4 butir lulus berbukti | RILIS-CHECKLIST.md | butuh: T-38, T-45, T-47, T-48, T-48A, T-48B | agent: - | commit: -
