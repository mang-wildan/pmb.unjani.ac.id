# ROLLBACK v1.3.0

Prosedur untuk server production (shell Linux, PM2 app `pmb-unjani` — ecosystem.config.js). Semua blok perintah siap salin-tempel SETELAH dua variabel ini diisi dan dijalankan di awal sesi shell:

```bash
# ISI DULU — path aplikasi di server yang BENAR-BENAR dipakai PM2
# (ecosystem.config.js menunjuk /www/wwwroot/dev-pmb.unjani.ac.id/v.1.0.1 yang tampak usang — verifikasi dengan: pm2 describe pmb-unjani | grep cwd)
export APP_DIR="/www/wwwroot/pmb.unjani.ac.id"
export BACKUP_DIR="/backup/pmb-v130"
cd "$APP_DIR"
export MONGO_URI="$(grep -E '^MONGO_URI=' .env | cut -d= -f2- | tr -d '\"')"
mkdir -p "$BACKUP_DIR"
```

Fakta arsitektur yang menentukan seluruh dokumen ini (sumber: IMPACT.md §3, DATA-MODEL.md):

1. Perubahan database v1.3.0 HANYA menambah dua koleksi baru. Tidak ada koleksi existing yang diubah. Karena itu **kode lama berjalan normal di atas database baru** — rollback kode TIDAK mengharuskan restore database.
2. **Database ini tidak menyimpan data pendaftar** — pendaftaran terjadi di sistem eksternal `pendaftaran.unjani.ac.id` yang tidak tersentuh rollback apa pun di sini. Yang bisa hilang saat restore adalah: artikel/kategori baru, suntingan konten (pengumuman, FAQ, biaya, dll.), log audit, dan berkas unggahan.

## 1. CHECKLIST PRA-DEPLOY

Jalankan SEMUA sebelum commit pertama Fase A di-deploy. Jangan lanjut bila ada yang gagal.

**1a. Inisialisasi git — WAJIB.** Folder proyek saat ini BUKAN repo git (tidak ada `.git`), padahal TODO.md menuntut hash commit dan rollback kode butuh titik kembali:

```bash
cd "$APP_DIR"
git init
git add -A
git commit -m "v1.2.0 — kondisi pra-v1.3.0"
git tag v1.2.0-pre
git rev-parse --short v1.2.0-pre   # catat hash ini di RILIS-CHECKLIST.md
```

**1b. Backup database penuh + verifikasi bisa dibaca:**

```bash
mongodump --uri="$MONGO_URI" --out="$BACKUP_DIR/db-$(date +%F-%H%M)"
ls -lah "$BACKUP_DIR"/db-*/ | head
# verifikasi dump tidak korup (dry run, tidak menulis apa pun):
mongorestore --uri="$MONGO_URI" --dryRun "$BACKUP_DIR"/db-*/ 2>&1 | tail -3
```

**1c. Backup berkas unggahan + aset (dua lokasi, keduanya wajib):**

```bash
tar czf "$BACKUP_DIR/uploads-$(date +%F-%H%M).tar.gz" -C "$APP_DIR" uploads public/uploads
tar tzf "$BACKUP_DIR"/uploads-*.tar.gz | head   # verifikasi isi terbaca
```

**1d. Backup aplikasi utuh (jalur restore tercepat, tanpa build ulang):**

```bash
tar czf "$BACKUP_DIR/app-pre-v130-$(date +%F-%H%M).tar.gz" -C "$APP_DIR" . \
  --exclude=node_modules --exclude=.next/cache
cp "$APP_DIR/.env" "$BACKUP_DIR/env-pre-v130.bak"
```

**1e. Catat kondisi runtime yang sedang berjalan:**

```bash
pm2 describe pmb-unjani | grep -E "cwd|script|port|status"
ss -ltnp | grep -E "9500|9531"        # port mana yang SEBENARNYA dipakai — konflik 9500 vs 9531 (IMPACT §9.4)
cat "$APP_DIR/.next/BUILD_ID"          # ID build yang sedang live
curl -sI https://pmb.unjani.ac.id | head -5
pm2 save
```

**1f. Verifikasi baseline SEO** (paralel dengan TODO T-01): view-source canonical live memakai domain resmi; simpan salinan `https://pmb.unjani.ac.id/sitemap.xml` ke `$BACKUP_DIR/sitemap-baseline.xml`:

```bash
curl -s https://pmb.unjani.ac.id/sitemap.xml -o "$BACKUP_DIR/sitemap-baseline.xml"
```

## 2. PEMBALIKAN MIGRATION

v1.3.0 tidak memakai kerangka migrasi — koleksi & index dibuat otomatis Mongoose saat model dipakai. Pembalikan = menghapus dua koleksi baru. Urutan mundur:

**2a. Hentikan penulisan dulu** (kalau aplikasi masih hidup dengan kode baru):

```bash
pm2 stop pmb-unjani
```

**2b. SELAMATKAN data artikel sebelum menghapus** — drop bersifat destruktif; artikel & kategori yang sudah dibuat admin akan hilang permanen tanpa langkah ini:

```bash
mongodump --uri="$MONGO_URI" --out="$BACKUP_DIR/artikel-sebelum-drop-$(date +%F-%H%M)" \
  --nsInclude='*.artikels' --nsInclude='*.kategoriartikels'
```

**2c. Cari nama koleksi persisnya lalu drop.** Nama mengikuti pluralisasi otomatis Mongoose dan belum pernah diverifikasi (DATA-MODEL.md) — JANGAN menebak:

```bash
mongosh "$MONGO_URI" --eval 'db.getCollectionNames().filter(n => /artikel/i.test(n))'
# ganti nama di bawah sesuai hasil di atas:
mongosh "$MONGO_URI" --eval 'db.artikels.drop(); db.kategoriartikels.drop()'
```

**2d. Berkas sampul artikel** yang telanjur terunggah di folder uploads tidak mengganggu apa pun bila dibiarkan (yatim). Opsional dibersihkan belakangan — bukan bagian jalur darurat.

**Yang TIDAK reversible di fase migration: TIDAK ADA.** v1.3.0 tidak menghapus kolom, tidak mengubah tipe, tidak mentransformasi data existing (IMPACT §3). Satu-satunya kehilangan data yang mungkin adalah isi dua koleksi baru itu sendiri — itulah gunanya 2b.

## 3. RESTORE DATABASE

Dibutuhkan HANYA bila data di koleksi existing rusak (skenario yang seharusnya mustahil di v1.3.0 — tidak ada perubahan tulis pada koleksi existing; lihat §6 sebelum memutuskan).

**3a. Bekukan aplikasi dan ambil potret kondisi SEKARANG (pasca-insiden) — jangan lewati:**

```bash
pm2 stop pmb-unjani
mongodump --uri="$MONGO_URI" --out="$BACKUP_DIR/post-insiden-$(date +%F-%H%M)"
tar czf "$BACKUP_DIR/uploads-post-insiden-$(date +%F-%H%M).tar.gz" -C "$APP_DIR" uploads public/uploads
```

**3b. Restore dari backup pra-deploy** (menimpa; semua perubahan sesudah backup hilang dari DB):

```bash
mongorestore --uri="$MONGO_URI" --drop "$BACKUP_DIR"/db-<TANGGAL-PRA-DEPLOY>/
```

**3c. Menangani data yang masuk SETELAH backup diambil — kasus tersulit.** Fakta dulu: data pendaftar TIDAK ada di database ini (tersimpan di sistem eksternal — tidak terpengaruh restore ini sama sekali). Yang berubah di antara backup dan insiden adalah data konten & operasional. Cara mengembalikannya selektif dari potret 3a:

```bash
# 1) lihat koleksi apa saja yang berubah setelah backup (bandingkan jumlah dokumen):
mongosh "$MONGO_URI" --eval 'db.getCollectionNames().forEach(n => print(n, db[n].countDocuments()))'

# 2) kembalikan PER KOLEKSI yang diyakini sehat dari potret pasca-insiden.
#    Contoh: log audit dan pengumuman yang dibuat setelah backup:
mongorestore --uri="$MONGO_URI" --drop \
  --nsInclude='*.auditlogs' --nsInclude='*.pengumumans' \
  "$BACKUP_DIR"/post-insiden-<TANGGAL>/

# 3) kembalikan berkas unggahan yang bertambah setelah backup:
tar xzf "$BACKUP_DIR"/uploads-post-insiden-<TANGGAL>.tar.gz -C "$APP_DIR"
```

Aturan memilihnya: koleksi yang DIDUGA terlibat insiden → pakai versi pra-deploy (3b); koleksi yang tidak terlibat → timpa kembali dengan versi pasca-insiden (langkah 2). Keputusan per koleksi dicatat tertulis sebelum dieksekusi. Kalau ragu satu koleksi sehat atau tidak: JANGAN dikembalikan dulu — dokumen pasca-insiden tetap aman di `$BACKUP_DIR`.

**3d. Nyalakan kembali dan uji:**

```bash
pm2 start pmb-unjani && pm2 logs pmb-unjani --lines 20
curl -sI https://pmb.unjani.ac.id | head -3
```

## 4. PEMBALIKAN KODE

**Jalur cepat (±2 menit, tanpa build) — untar aplikasi pra-deploy:**

```bash
pm2 stop pmb-unjani
cd "$APP_DIR"
tar xzf "$BACKUP_DIR"/app-pre-v130-<TANGGAL>.tar.gz -C "$APP_DIR"
# arsip 1d sudah berisi .next hasil build lama → tidak perlu build ulang
yarn install --frozen-lockfile     # samakan node_modules dengan lockfile lama
pm2 start pmb-unjani && pm2 logs pmb-unjani --lines 20
```

**Jalur git (bila perlu kembali ke commit tertentu, mis. membatalkan satu task TODO saja):**

```bash
cd "$APP_DIR"
git log --oneline -10                     # temukan hash task yang bermasalah (kolom commit di TODO.md)
git revert <hash-task-bermasalah>         # membatalkan satu task; ATAU kembali total:
git checkout v1.2.0-pre
yarn install --frozen-lockfile
yarn build                                # checkout lama TIDAK membawa .next → wajib build ulang
pm2 restart pmb-unjani && pm2 logs pmb-unjani --lines 20
```

Catatan aset ter-build: `.next` TIDAK dilacak git — setelah `git checkout`/`revert`, `.next` yang ada masih hasil build kode baru. `yarn build` di atas wajib, atau pakai jalur untar yang sudah membawa `.next` lama. Setelah aplikasi hidup: uji manual CTA "Daftar Sekarang" di ponsel + desktop SEBELUM menyatakan rollback selesai (jalur konversi utama — IMPACT §9).

## 5. TITIK TIDAK BISA KEMBALI (mitigasi, bukan pembalikan)

| # | Perubahan permanen | Mitigasi (karena membalikkan = mustahil) |
|---|---|---|
| 1 | Canonical/hreflang EN sudah terindeks (T-05/T-06/T-08). Google telanjur mengevaluasi /en sebagai halaman mandiri | JANGAN dicabut walau rollback kode dilakukan untuk alasan lain — biarkan halaman EN tetap hidup dan sinyalnya konsisten. Bila strategi EN benar-benar dibatalkan di masa depan: turunkan bertahap (noindex pada /en) sambil membiarkan halamannya tetap merespons — bukan 404 mendadak |
| 2 | URL artikel yang telanjur terindeks lalu dihapus/diarsipkan | Pertahankan slug selamanya (kode sudah mengunci slug — FR-03; soft delete membuat URL bisa dihidupkan lagi). Untuk artikel yang dihapus final dan tidak akan kembali: pasang redirect 301 dari URL artikel itu ke indeks `/artikel` |
| 3 | Sitemap/canonical pernah terpancar dengan domain salah (mis. SITE_URL kosong → localhost) | Pencegahan adalah satu-satunya obat murah: T-01 & gerbang T-49 memblokir rilis sebelum verifikasi. Bila telanjur: perbaiki nilai, deploy, lalu kirim ulang sitemap via Google Search Console dan minta validasi ulang — pemulihan indeks berminggu-minggu, tidak bisa dipercepat |
| 4 | 5 halaman lama ber-`permanentRedirect` 308 sejak v1.2.0 (di-cache permanen oleh browser & Google) | Jangan pernah memakai ulang path `/biaya-pendidikan`, `/jadwal`, `/jalur-seleksi`, `/kalkulator`, `/manual-book` untuk konten baru — pengunjung lama tidak akan pernah melihatnya |
| 5 | Event analytics yang telanjur terkirim dengan nama/parameter salah | Data historis GA tidak bisa diedit. Mitigasi: bekukan daftar nama event di satu file (T-13) sebelum event pertama terkirim; kalau nama terlanjur salah, buat nama baru dan catat tanggal potong di RILIS-CHECKLIST — jangan menimpa makna nama lama |

## 6. URUTAN KEPUTUSAN

Urutan eskalasi — selalu pilih nomor terkecil yang menyelesaikan masalah:

1. **Hotfix maju (default).** Gejala: bug fungsional terisolasi — section artikel rusak, form admin error, event tidak terkirim, tampilan pecah. Tindakan: `git revert <hash task>` (satu commit = satu task, by design TODO.md) + deploy. Landing dan alur pendaftaran punya fail-soft; mayoritas insiden v1.3.0 selesai di sini.
2. **Rollback kode saja (§4), TANPA sentuh database.** Gejala: aplikasi tidak stabil menyeluruh (crash loop, halaman publik mati) dan penyebab belum jelas. Aman karena kode lama mengabaikan dua koleksi baru — artikel "menghilang" dari situs tapi datanya utuh menunggu deploy ulang. Kirim ulang sitemap TIDAK perlu; canonical/hreflang ikut kembali lama → lihat mitigasi §5.1 sebelum memutuskan menahan rollback lama-lama.
3. **Rollback kode + drop koleksi baru (§2).** Hanya bila koleksi baru itu sendiri sumber masalah (mis. index membebani server). Wajib didahului dump 2b.
4. **Restore database (§3) — pilihan terakhir, hampir pasti tidak dibutuhkan.** Hanya bila data koleksi EXISTING terbukti korup akibat rilis ini. Sebelum menekan tombol, baca ini:

> **Pernyataan eksplisit tentang masa pendaftaran berjalan:** rilis v1.3.0 berlangsung di tengah gelombang aktif. Data PENDAFTAR tidak tersimpan di database ini — restore TIDAK menghilangkan pendaftar (mereka aman di sistem eksternal). Tapi restore penuh menghapus semua pekerjaan admin sejak backup (pengumuman, perubahan biaya/jadwal yang tampil ke calon pendaftar, log audit) dan mematikan situs — etalase kampanye — selama prosesnya. Informasi biaya/jadwal yang mundur ke versi lama bisa MENYESATKAN calon pendaftar yang sedang mengambil keputusan. Karena itu: restore hanya dengan persetujuan eksplisit pemilik produk, di luar jam ramai, dengan potret pasca-insiden (3a) sudah di tangan, dan dengan rencana pengembalian selektif (3c) tertulis sebelum eksekusi.

Siapa memutuskan: level 1–2 boleh oleh pelaksana dengan pemberitahuan; level 3–4 wajib persetujuan pemilik produk tertulis.
