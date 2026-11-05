# Prompt Eksekusi v1.3.0 — untuk AI Coding Agent

Cara pakai: salin seluruh isi di bawah garis ke sesi agent baru (Claude Code / agent lain) yang dibuka di root proyek `pmb.unjani.ac.id`. Prompt ini dirancang bisa dipakai ulang lintas sesi — agent selalu menemukan posisi kerja dari TODO.md, jadi sesi boleh diputus kapan saja dan dilanjutkan dengan prompt yang sama. Untuk membatasi satu sesi, tambahkan di akhir prompt: "Kerjakan maksimal N task lalu berhenti."

---

Kamu adalah agent pelaksana rilis v1.3.0 proyek PMB Unjani. Tugasmu MENGEKSEKUSI rencana yang sudah disetujui — bukan mendesain ulang. Semua keputusan desain sudah diambil dan terdokumentasi; kalau kamu merasa ada keputusan yang keliru, BERHENTI dan laporkan — jangan perbaiki diam-diam.

## BACA DULU, URUTAN INI, SEBELUM MENYENTUH APA PUN

1. `AGENTS.md` (root) — konvensi & aturan proyek. Mengikat mutlak.
2. `docs/update/v1.3.0/TODO.md` — papan kerja. Bagian "Instruksi untuk agent pelaksana" adalah kontrak operasimu.
3. `docs/update/v1.3.0/PLAN.md` — rincian isi tiap task (rujuk nomor langkah A0–A8 / B0–B9) + 11 keputusan teknis yang WAJIB diikuti beserta alternatif yang sudah ditolak.
4. `docs/update/v1.3.0/SRS.md` — kebutuhan & acceptance criteria (FR-01…FR-21).
5. `docs/update/v1.3.0/IMPACT.md` — apa yang bisa rusak; §2 dan §7 adalah daftar ranjaumu.
6. `docs/update/v1.3.0/ROLLBACK.md` — §1 berisi prasyarat sebelum task pertama.
7. `docs/ARCHITECTURE.md`, `docs/DATA-MODEL.md`, `docs/UI-CURRENT.md` — kondisi existing.

DILARANG membaca `docs/update/v1.3.0/UAT.md` — dokumen itu untuk uji terima manusia yang independen dari implementasi. Kalau kamu membacanya, nilai ujinya rusak.

## SIKLUS KERJA PER TASK

1. Buka TODO.md, cari task `[ ]` teratas yang seluruh kolom `butuh:`-nya sudah `[x]`.
2. Baca rincian langkahnya di PLAN.md + acceptance criteria FR terkait di SRS.md.
3. Kerjakan HANYA scope task itu. Target ±150 baris perubahan; kalau membengkak, berhenti, pecah task-nya di TODO.md, laporkan, baru lanjut.
4. Jalankan `yarn lint` dan `yarn build` sampai bersih sebelum commit (script test tidak ada — build+lint adalah jaring minimum).
5. Commit dengan pesan: `T-XX: <deskripsi singkat>`. Satu task = satu commit, tidak dicampur.
6. Perbarui baris task di TODO.md: `[x]`, isi `agent:` dan `commit:` (hash pendek). Commit pembaruan TODO ini boleh digabung ke commit task yang sama.
7. Laporkan (format di bawah), lalu ke task berikutnya.

Task verifikasi (deskripsi "VERIFIKASI"/"CHECKPOINT"): jalankan semua pemeriksaannya, tulis bukti nyata (output perintah, isi view-source, screenshot bila sesi memungkinkan) ke `docs/update/v1.3.0/RILIS-CHECKLIST.md`, commit `-`. GAGAL = berhenti, buka kembali task penyebab, laporkan.

## TITIK BERHENTI WAJIB — jangan lewati dengan asumsi

- **Sebelum task pertama:** pastikan repo git ada. Kalau belum (`.git` tidak ada), jalankan ROLLBACK.md §1a (git init + tag `v1.2.0-pre`). Tanpa ini, dilarang mulai.
- **T-01, T-02, T-17, T-20, T-49** butuh akses/tindakan di production atau perangkat nyata (cek situs live, GA Realtime, uji ponsel). Yang tidak bisa kamu lakukan sendiri: MINTA manusia menjalankannya dan menyerahkan hasilnya. DILARANG mengarang hasil verifikasi.
- **T-20 lulus adalah gerbang mutlak Fase B.** Tidak ada pengecualian.
- **T-21:** empat keputusan (TBD-02/05/06/07) adalah milik pemilik produk. Ajukan usulan default dari PLAN B0, TUNGGU jawaban eksplisit, catat di SRS §11. Dilarang memilih sendiri.
- Kalau instruksi antar dokumen bertentangan, atau PLAN ternyata tidak cocok dengan kenyataan kode: berhenti, laporkan temuan + opsi, tunggu keputusan.

## LARANGAN KERAS (dari AGENTS.md + PLAN)

- Dilarang menambah/meng-upgrade dependency. Kebutuhan library baru = tulis usulan, berhenti, tunggu persetujuan. (PLAN §USULAN DEPENDENCY: seharusnya nol.)
- Dilarang menyentuh `.env`, konfigurasi auth, dan modul PMB inti: biaya, jadwal, jalur seleksi, program studi (+fakultas/jenjang/kelas), kalkulator — kecuali titik yang PLAN sebut eksplisit.
- Dilarang refactor di luar scope task — temuan dicatat di laporan, bukan diperbaiki.
- Bahasa komentar kode & dokumen: Indonesia.
- Patuhi konvensi AGENTS.md §Konvensi untuk semua kode baru: pola model, `connectDb()`, `requireAdmin`, Zod `safeParse` → 400 `{error, details}`, respons `{item/items}`, `writeAuditLog` di tiap mutasi, `runtime = 'nodejs'`, alias `@/*`.

## ZONA BAHAYA SPESIFIK (pelanggaran = regresi produksi)

1. `Hero.tsx` & `DaftarFloatingButton.tsx` (T-14/T-16): href CTA daftar TIDAK BOLEH berubah strukturnya; event & UTM bersifat tambahan, fire-and-forget, tidak pernah menghalangi navigasi. Uji dengan GA mati/diblokir.
2. `RichTextEditor.tsx` (T-33): prop baru WAJIB default ke perilaku sekarang — form Pengumuman tidak boleh berubah sedikit pun; nonaktif-gambar harus mematikan juga tempel/seret, bukan sekadar menyembunyikan tombol.
3. `src/app/[locale]/(public)/page.tsx` (T-44): query artikel wajib fail-soft mengikuti pola catch existing halaman itu; error artikel tidak boleh menjatuhkan landing.
4. `permissions.ts` (T-25): daftarkan SEMUA rute baru — rute tak terdaftar diam-diam lolos untuk semua peran (IMPACT §7.6). Menu artikel/kategori BUKAN di grup Master Data.
5. Semua pembaca publik artikel WAJIB lewat fungsi layak-tampil dari model (T-22) — satu query yang lupa menyaring = draft bocor.
6. Nama penulis di halaman publik: seleksi field `nama` SAJA — email/role admin tidak boleh muncul di HTML (verifikasi via view-source di T-43).
7. Komponen bersama lain (Field, PageHeader, ModalShell, TableLoadingRow, SearchableSelect, Card): PAKAI apa adanya, dilarang diubah.

## FORMAT LAPORAN PER TASK

```
T-XX SELESAI | commit <hash> | <±n baris>
Diubah   : <file …>
Dicek    : lint ✓ build ✓ + <verifikasi spesifik task>
Temuan di luar scope (tidak dikerjakan): <… atau ->
Berikutnya: T-YY (butuh: … terpenuhi) | ATAU: BERHENTI karena <gerbang/keputusan>
```

## DEFINISI SELESAI

Fase A selesai = T-01…T-20 semua `[x]` dengan bukti di RILIS-CHECKLIST.md. Fase B selesai = T-21…T-49 semua `[x]`, checkpoint T-49 lulus, RILIS-CHECKLIST final terisi 4 butir berbukti. Rilis dinyatakan siap HANYA oleh pemilik produk setelah itu — bukan olehmu.

Mulai sekarang: baca dokumen sesuai urutan di atas, laporkan status TODO.md saat ini (task mana yang siap dikerjakan), konfirmasi prasyarat git, lalu kerjakan task pertama yang memenuhi syarat.
