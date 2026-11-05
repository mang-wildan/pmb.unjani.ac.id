# UAT v1.3.0 — Skenario Uji Terima Pengguna

Dasar: docs/update/v1.3.0/SRS.md (FR-01…FR-21, §6, §7) dan SEO-AUDIT.md. Ditulis TANPA melihat implementasi — menguji apa yang diminta, bukan apa yang dibangun.

**Cara pakai:** jalankan berurutan; isi kolom Lulus/Gagal (☐) dan Catatan saat pengujian. Istilah yang dipakai: "halaman kelola" = area admin setelah login; "pengunjung" = orang tanpa login; "alamat halaman" = URL di bilah alamat browser. Halaman publik diuji di **desktop dan ponsel** (kasus yang wajib dua perangkat ditandai 📱💻).

**Akun & data yang perlu disiapkan sebelum mulai:**

- Akun Editor A, Editor B, Admin, Superadmin — semuanya aktif.
- Satu kategori artikel contoh (mis. "Beasiswa") dan satu tag contoh (mis. "snbt").
- Berkas untuk uji: foto normal (±1–2MB), foto sangat besar (>20MB), berkas bukan gambar (mis. PDF), foto ukuran 4000×3000.
- Akses ke Google Analytics milik situs (untuk UAT-38) dan grup WhatsApp uji (untuk UAT-35).

---

## A. Artikel — dasar di halaman kelola

### UAT-01 — Membuat artikel baru, tersimpan sebagai Draft
- FR terkait: FR-01
- Peran penguji: Editor A
- Prasyarat data: akun Editor A aktif
- Langkah:
  1. Masuk ke halaman kelola, buka menu artikel.
  2. Buat artikel baru: isi judul "Artikel Uji 01" dan tulis isi beberapa paragraf.
  3. Simpan.
- Hasil yang diharapkan: artikel tersimpan berstatus Draft dan muncul di daftar artikel halaman kelola.
- Lulus/Gagal: ☐
- Catatan: —

### UAT-02 — (Negatif) Menyimpan artikel dengan kolom wajib kosong
- FR terkait: FR-01
- Peran penguji: Editor A
- Prasyarat data: —
- Langkah:
  1. Buat artikel baru, kosongkan judul, isi hanya diberi satu kata, coba simpan.
  2. Ulangi sebaliknya: isi judul, kosongkan isi, coba simpan.
- Hasil yang diharapkan: kedua percobaan ditolak dengan pesan yang menyebut kolom mana yang kurang; tidak ada artikel setengah jadi yang tersimpan diam-diam.
- Lulus/Gagal: ☐
- Catatan: —

### UAT-03 — Menerbitkan Draft
- FR terkait: FR-02 (AC1)
- Peran penguji: Editor A, lalu pengunjung
- Prasyarat data: UAT-01 lulus; artikel sudah diberi sampul & kategori
- Langkah:
  1. Buka "Artikel Uji 01" di halaman kelola, terbitkan.
  2. Sebagai pengunjung (tanpa login, browser lain/mode penyamaran), buka halaman daftar artikel publik.
- Hasil yang diharapkan: status berubah menjadi Terbit; artikel terlihat oleh pengunjung.
- Lulus/Gagal: ☐
- Catatan: —

### UAT-04 — Artikel Terjadwal tampil sendiri saat waktunya tiba
- FR terkait: FR-02 (AC2)
- Peran penguji: Admin, lalu pengunjung
- Prasyarat data: artikel lengkap (judul, isi, sampul, kategori) berstatus Draft
- Langkah:
  1. Jadwalkan artikel untuk tayang 15 menit dari sekarang, lalu keluar dari halaman kelola dan JANGAN lakukan apa pun lagi.
  2. Sebelum waktunya: sebagai pengunjung, pastikan artikel BELUM terlihat di daftar publik dan alamat langsungnya belum menampilkan isi.
  3. Beberapa menit SETELAH waktu tayang lewat: muat ulang halaman publik.
- Hasil yang diharapkan: sebelum waktunya artikel tidak terlihat pengunjung; setelah waktunya artikel tampil tanpa ada tindakan admin apa pun.
- Lulus/Gagal: ☐
- Catatan: beri toleransi beberapa menit setelah waktu tayang sebelum menyatakan gagal.

### UAT-05 — Mengarsipkan artikel
- FR terkait: FR-02 (AC3)
- Peran penguji: Editor A, lalu pengunjung
- Prasyarat data: satu artikel berstatus Terbit
- Langkah:
  1. Arsipkan artikel tersebut dari halaman kelola.
  2. Sebagai pengunjung: cek daftar artikel publik, kartu di beranda, dan alamat langsung artikel.
  3. Kembali ke halaman kelola: cari artikel tadi.
- Hasil yang diharapkan: artikel hilang dari semua tampilan pengunjung; di halaman kelola tetap ada dengan status Arsip.
- Lulus/Gagal: ☐
- Catatan: —

### UAT-06 — Alamat halaman terbentuk otomatis dari judul
- FR terkait: FR-03 (AC1)
- Peran penguji: Editor A
- Prasyarat data: —
- Langkah:
  1. Buat artikel berjudul "Beasiswa UNJANI 2027", lengkapi, simpan, lalu terbitkan.
  2. Buka artikel itu sebagai pengunjung dan perhatikan alamat halamannya.
- Hasil yang diharapkan: alamat halaman memuat judul dalam bentuk rapi (huruf kecil, kata-kata tersambung tanda hubung, tanpa mengetik alamat manual saat membuat artikel).
- Lulus/Gagal: ☐
- Catatan: —

### UAT-07 — Mengubah judul setelah terbit TIDAK mengubah alamat
- FR terkait: FR-03 (AC2)
- Peran penguji: Editor A, lalu pengunjung
- Prasyarat data: artikel UAT-06 sudah Terbit; catat alamat halamannya
- Langkah:
  1. Salin alamat halaman artikel (mis. kirim ke diri sendiri di WhatsApp).
  2. Di halaman kelola, ubah judul artikel menjadi "Beasiswa UNJANI 2027 — Diperbarui", simpan.
  3. Klik tautan yang tadi disalin.
- Hasil yang diharapkan: tautan lama tetap membuka artikel yang sama (dengan judul baru); alamat halaman tidak berubah.
- Lulus/Gagal: ☐
- Catatan: —

### UAT-08 — (Negatif) Dua artikel berjudul sama
- FR terkait: FR-03; SRS §7.1–7.2
- Peran penguji: Editor A
- Prasyarat data: artikel "Artikel Uji 01" sudah ada
- Langkah:
  1. Buat artikel BARU dengan judul persis sama: "Artikel Uji 01", lengkapi, simpan, terbitkan.
  2. Buka keduanya sebagai pengunjung.
- Hasil yang diharapkan: keduanya tersimpan dan bisa dibuka; alamat halaman keduanya BERBEDA; tidak ada artikel yang tertimpa; tidak muncul pesan error yang membingungkan.
- Lulus/Gagal: ☐
- Catatan: —

### UAT-09 — Kategori: dibuat, dipakai, dan menyaring daftar
- FR terkait: FR-04
- Peran penguji: Editor A, lalu pengunjung
- Prasyarat data: —
- Langkah:
  1. Di halaman kelola, buat kategori baru "Beasiswa".
  2. Buat & terbitkan artikel dengan kategori "Beasiswa"; terbitkan juga satu artikel berkategori lain.
  3. Sebagai pengunjung, buka daftar artikel publik dan saring berdasarkan kategori "Beasiswa".
- Hasil yang diharapkan: label kategori tampil di artikel; saat disaring, hanya artikel berkategori "Beasiswa" yang muncul.
- Lulus/Gagal: ☐
- Catatan: —

### UAT-10 — Tag: tampil dan bisa diklik untuk menyaring
- FR terkait: FR-05
- Peran penguji: Editor A, lalu pengunjung
- Prasyarat data: dua artikel terbit ber-tag "snbt", satu artikel terbit tanpa tag itu
- Langkah:
  1. Sebagai pengunjung, buka salah satu artikel ber-tag "snbt".
  2. Klik tulisan tag "snbt".
- Hasil yang diharapkan: muncul daftar yang berisi tepat dua artikel ber-tag "snbt"; artikel tanpa tag itu tidak ikut.
- Lulus/Gagal: ☐
- Catatan: —

### UAT-11 — Nama penulis muncul otomatis dari akun
- FR terkait: FR-06
- Peran penguji: Editor A (misal nama akunnya "Rina"), lalu pengunjung
- Prasyarat data: akun Editor A bernama jelas
- Langkah:
  1. Sebagai Editor A, buat dan terbitkan artikel — perhatikan: di formulir TIDAK pernah mengetik nama penulis.
  2. Sebagai pengunjung, lihat kartu artikel di beranda dan halaman artikelnya.
- Hasil yang diharapkan: nama "Rina" tampil sebagai penulis di kartu dan halaman artikel, tanpa pernah diketik manual.
- Lulus/Gagal: ☐
- Catatan: —

### UAT-12 — Ringkasan terbentuk otomatis dari isi
- FR terkait: FR-07
- Peran penguji: Editor A, lalu pengunjung
- Prasyarat data: artikel dengan isi panjang (beberapa paragraf)
- Langkah:
  1. Saat membuat artikel, periksa formulir: pastikan TIDAK ada kolom "ringkasan" yang harus diisi.
  2. Terbitkan, lalu lihat kartunya di beranda/daftar sebagai pengunjung.
- Hasil yang diharapkan: kartu menampilkan ringkasan berupa potongan kalimat awal isi artikel, berupa teks biasa (tidak ada kode/simbol aneh, tidak ada potongan gambar).
- Lulus/Gagal: ☐
- Catatan: —

## B. Artikel — sampul & berkas

### UAT-13 — (Negatif) Terbit tanpa sampul ditolak
- FR terkait: FR-08 (AC1); SRS §7.3
- Peran penguji: Editor A
- Prasyarat data: artikel Draft lengkap TAPI tanpa foto sampul
- Langkah:
  1. Coba terbitkan artikel tersebut.
  2. Coba juga menjadwalkannya.
- Hasil yang diharapkan: keduanya ditolak dengan pesan yang menyebut sampul wajib diisi; artikel tetap Draft; Draft tanpa sampul tetap boleh tersimpan.
- Lulus/Gagal: ☐
- Catatan: —

### UAT-14 — Sampul besar diseragamkan otomatis
- FR terkait: FR-08 (AC2)
- Peran penguji: Editor A, lalu pengunjung
- Prasyarat data: foto ukuran 4000×3000 (bentuk 4:3)
- Langkah:
  1. Unggah foto itu sebagai sampul artikel, terbitkan.
  2. Sebagai pengunjung, buka artikel; klik kanan foto sampul → simpan gambar ke komputer.
  3. Lihat berkas yang tersimpan: ukuran file dan bentuknya.
- Hasil yang diharapkan: gambar yang diterima pengunjung berbentuk melebar 16:9 (bukan 4:3 asli), lebar tidak lebih dari 1200 piksel, dan ukuran file tidak lebih dari 300KB.
- Lulus/Gagal: ☐
- Catatan: cara melihat ukuran & dimensi: klik kanan berkas → Properties (Windows) / Get Info (Mac).

### UAT-15 — (Negatif) Berkas bukan gambar ditolak sebagai sampul
- FR terkait: FR-08; NFR keamanan upload (SRS §9)
- Peran penguji: Editor A
- Prasyarat data: berkas PDF apa pun
- Langkah:
  1. Coba unggah PDF tersebut sebagai foto sampul.
  2. Bila komputer memungkinkan, coba juga PDF yang namanya diubah berakhiran gambar (mis. dari .pdf menjadi .jpg).
- Hasil yang diharapkan: keduanya ditolak dengan pesan jelas; tidak ada yang tersimpan sebagai sampul.
- Lulus/Gagal: ☐
- Catatan: percobaan kedua menguji bahwa sistem memeriksa isi berkas, bukan sekadar nama.

### UAT-16 — (Negatif) Gambar terlalu besar
- FR terkait: FR-08, FR-19; TBD-02
- Peran penguji: Editor A
- Prasyarat data: foto >20MB
- Langkah:
  1. Coba unggah foto tersebut sebagai sampul.
- Hasil yang diharapkan: sistem menolak dengan pesan yang bisa dipahami ATAU memprosesnya sampai selesai — yang tidak boleh: gagal diam-diam, berputar tanpa akhir, atau halaman error teknis.
- Lulus/Gagal: ☐
- Catatan: batas resmi ukuran unggahan masih TBD-02 di SRS; catat perilaku yang terjadi.

## C. Artikel — hapus, pulihkan, lintas peran

### UAT-17 — Menghapus artikel (soft delete)
- FR terkait: FR-14 (AC1)
- Peran penguji: Editor A, lalu pengunjung
- Prasyarat data: artikel Terbit milik Editor A; catat alamat halamannya
- Langkah:
  1. Hapus artikel dari halaman kelola.
  2. Cek daftar artikel utama di halaman kelola, lalu cek daftar "terhapus".
  3. Sebagai pengunjung: buka beranda, daftar artikel, dan alamat langsung artikel tadi.
- Hasil yang diharapkan: artikel hilang dari daftar utama tapi ada di daftar terhapus; pengunjung tidak menemukannya di mana pun; alamat langsungnya menampilkan halaman "tidak ditemukan" yang rapi (bukan error teknis/halaman kosong).
- Lulus/Gagal: ☐
- Catatan: —

### UAT-18 — (Lintas peran) Pemulihan artikel orang lain
- FR terkait: FR-14 (AC2); SRS §6
- Peran penguji: Editor B, lalu Admin
- Prasyarat data: artikel terhapus milik Editor A (dari UAT-17)
- Langkah:
  1. Masuk sebagai Editor B, buka daftar terhapus, cari artikel milik Editor A dan coba pulihkan.
  2. Keluar, masuk sebagai Admin, lakukan hal yang sama.
- Hasil yang diharapkan: Editor B tidak melihat/tidak bisa memulihkan artikel milik A; Admin bisa memulihkannya.
- Lulus/Gagal: ☐
- Catatan: —

### UAT-19 — Artikel pulih kembali ke alamat yang sama
- FR terkait: FR-14; SRS §7.5, FR-03
- Peran penguji: Admin, lalu pengunjung
- Prasyarat data: artikel yang dipulihkan pada UAT-18; alamat lamanya tercatat
- Langkah:
  1. Setelah dipulihkan, klik tautan alamat lama artikel sebagai pengunjung.
- Hasil yang diharapkan: alamat lama kembali menampilkan artikel seperti sedia kala, dengan status seperti sebelum dihapus.
- Lulus/Gagal: ☐
- Catatan: —

### UAT-20 — Penulis dinonaktifkan, artikel tetap utuh
- FR terkait: FR-06; SRS §7.4
- Peran penguji: Superadmin, lalu pengunjung
- Prasyarat data: artikel Terbit milik Editor A
- Langkah:
  1. Sebagai Superadmin, nonaktifkan akun Editor A dari pengelolaan pengguna.
  2. Sebagai pengunjung: buka beranda dan halaman artikel milik Editor A.
- Hasil yang diharapkan: artikel tetap tampil normal dan nama penulis tetap muncul; tidak ada halaman error.
- Lulus/Gagal: ☐
- Catatan: aktifkan kembali akun Editor A setelah uji selesai.

### UAT-21 — (Lintas peran) Menyunting artikel milik orang lain
- FR terkait: SRS §6
- Peran penguji: Editor B, Admin
- Prasyarat data: artikel milik Editor A
- Langkah:
  1. Sebagai Editor B, coba buka artikel milik A untuk disunting dan coba simpan perubahan.
  2. Sebagai Admin, lakukan penyuntingan yang sama.
- Hasil yang diharapkan: Editor B ditolak (tidak bisa menyimpan perubahan pada milik A); Admin berhasil.
- Lulus/Gagal: ☐
- Catatan: —

### UAT-22 — (Negatif) Pengunjung membuka halaman kelola
- FR terkait: SRS §6; kondisi existing
- Peran penguji: Pengunjung (tanpa login)
- Prasyarat data: —
- Langkah:
  1. Tanpa login, ketik langsung alamat halaman kelola artikel di browser.
- Hasil yang diharapkan: diarahkan ke halaman login; tidak ada data artikel/nama pengguna yang sempat terlihat.
- Lulus/Gagal: ☐
- Catatan: —

### UAT-23 — (Negatif) Sesi kedaluwarsa di tengah bekerja
- FR terkait: SRS §6, §9 (keamanan)
- Peran penguji: Editor A
- Prasyarat data: cara mengakhiri sesi (mis. hapus cookie, atau tunggu masa sesi habis, atau logout dari tab lain)
- Langkah:
  1. Buka formulir artikel, biarkan/akhiri sesi login dari tab lain.
  2. Kembali ke formulir dan coba simpan.
- Hasil yang diharapkan: sistem meminta login ulang; tidak menyimpan atas nama yang salah; tidak ada error teknis mentah.
- Lulus/Gagal: ☐
- Catatan: SRS tidak merinci apakah ketikan yang belum tersimpan diselamatkan — catat perilakunya sebagai masukan.

### UAT-24 — (Lintas peran) Konten non-publik tidak bocor ke pengunjung
- FR terkait: FR-02; SRS §7, §9 (privasi)
- Peran penguji: Pengunjung
- Prasyarat data: satu artikel Draft, satu Terjadwal (belum waktunya), satu Arsip, satu terhapus — semua judulnya diketahui penguji
- Langkah:
  1. Sebagai pengunjung, cari keempat judul itu lewat pencarian artikel.
  2. Periksa juga daftar artikel, saringan kategori, saringan tag, dan halaman peta situs (lihat UAT-33).
  3. Bila alamat langsungnya diketahui, coba buka satu per satu.
- Hasil yang diharapkan: keempat artikel itu tidak muncul di mana pun dan alamat langsungnya tidak menampilkan isi.
- Lulus/Gagal: ☐
- Catatan: kasus paling penting untuk kerahasiaan konten yang belum siap tayang.

## D. Halaman publik 📱💻

### UAT-25 — Beranda: tepat 3 kartu, unggulan pertama, unsur lengkap
- FR terkait: FR-09 (AC1, AC2)
- Peran penguji: Pengunjung — di desktop DAN ponsel
- Prasyarat data: minimal 5 artikel Terbit, salah satunya ditandai unggulan (bukan yang terbaru)
- Langkah:
  1. Buka beranda di desktop, gulir ke bagian artikel.
  2. Hitung kartunya dan perhatikan urutannya.
  3. Periksa isi tiap kartu satu per satu.
  4. Ulangi seluruhnya di ponsel.
- Hasil yang diharapkan: tepat 3 kartu; artikel unggulan di posisi pertama, dua sisanya artikel terbaru; setiap kartu memuat kelimanya: foto, judul, ringkasan, nama penulis, tanggal; di ponsel tidak ada bagian terpotong.
- Lulus/Gagal: ☐
- Catatan: —

### UAT-26 — Daftar artikel: 9 per halaman + navigasi
- FR terkait: FR-10 (AC1)
- Peran penguji: Pengunjung — desktop dan ponsel
- Prasyarat data: minimal 20 artikel Terbit
- Langkah:
  1. Buka halaman daftar artikel.
  2. Hitung kartu di halaman pertama.
  3. Pindah ke halaman 2 dan 3 lewat navigasi halaman.
  4. Ulangi di ponsel.
- Hasil yang diharapkan: 9 kartu per halaman; navigasi berpindah halaman dengan benar tanpa artikel terulang/terlewat; nyaman dipakai di ponsel.
- Lulus/Gagal: ☐
- Catatan: —

### UAT-27 — Pencarian artikel berdasarkan judul (+ hasil kosong)
- FR terkait: FR-10 (AC2)
- Peran penguji: Pengunjung
- Prasyarat data: artikel berjudul mengandung kata "beasiswa"; tidak ada artikel dengan kata "xyzzy"
- Langkah:
  1. Cari kata "beasiswa" → periksa hasil.
  2. Cari kata "xyzzy" → periksa hasil.
  3. Cari dengan menyisipkan simbol aneh (mis. tanda kutip, %, *) → periksa halaman tetap waras.
- Hasil yang diharapkan: pencarian pertama hanya menampilkan artikel yang judulnya memuat kata itu; pencarian kedua menampilkan keadaan "tidak ada hasil" yang rapi; simbol aneh tidak menimbulkan error teknis.
- Lulus/Gagal: ☐
- Catatan: —

### UAT-28 — Isi artikel terbaca tanpa menjalankan aplikasi (untuk mesin pencari)
- FR terkait: FR-11 (AC1)
- Peran penguji: Siapa pun, di desktop
- Prasyarat data: satu artikel Terbit
- Langkah:
  1. Buka halaman artikel di browser desktop.
  2. Klik kanan → "Lihat Sumber Halaman" (View Page Source).
  3. Gunakan Ctrl+F: cari judul artikel, lalu cari sepotong kalimat dari tengah isi artikel.
- Hasil yang diharapkan: judul ditemukan (termasuk di dalam tag `<title>`) dan kalimat isi ditemukan di sumber halaman — artinya kontennya sampai ke mesin pencari.
- Lulus/Gagal: ☐
- Catatan: —

### UAT-29 — Versi bahasa Inggris & fallback
- FR terkait: FR-11 (AC2)
- Peran penguji: Pengunjung
- Prasyarat data: artikel X TANPA terjemahan Inggris; artikel Y DENGAN judul terjemahan Inggris
- Langkah:
  1. Ganti bahasa situs ke English lewat tombol bahasa.
  2. Buka artikel X → periksa tampilannya.
  3. Buka artikel Y → periksa judulnya.
- Hasil yang diharapkan: artikel X tampil utuh berbahasa Indonesia (tanpa error, tanpa bagian kosong); artikel Y menampilkan judul Inggrisnya.
- Lulus/Gagal: ☐
- Catatan: —

### UAT-34 — Singkatan fakultas tahan penerjemahan otomatis
- FR terkait: FR-21 (AC1–AC3)
- Peran penguji: Pengunjung — desktop dan ponsel
- Prasyarat data: browser dengan fitur terjemahan otomatis (mis. Chrome)
- Langkah:
  1. Buka beranda, gulir ke bagian Fakultas & Program Studi; foto/screenshot tampilannya (pembanding).
  2. Aktifkan penerjemahan otomatis halaman ke English.
  3. Perhatikan tulisan singkatan: FEB, FT, dan lainnya.
  4. Matikan penerjemahan; arahkan kursor (atau tekan-tahan di ponsel) ke singkatan.
  5. Bandingkan tampilan dengan foto langkah 1.
- Hasil yang diharapkan: saat diterjemahkan, "FEB" TETAP tertulis "FEB" (tidak menjadi "February"/"Feb"); nama lengkap fakultas muncul sebagai keterangan; tampilan normal tidak berubah dibanding sebelum perbaikan.
- Lulus/Gagal: ☐
- Catatan: —

## E. SEO — dalam langkah yang bisa diverifikasi siapa pun

### UAT-30 — Meta otomatis dari artikel (tanpa isian manual)
- FR terkait: FR-12 (AC1)
- Peran penguji: Siapa pun, desktop
- Prasyarat data: artikel Terbit yang kolom meta-nya sengaja dikosongkan
- Langkah:
  1. Buka halaman artikel → klik kanan → Lihat Sumber Halaman.
  2. Ctrl+F "title" → baca isi tag `<title>`.
  3. Ctrl+F "description" → baca isinya.
  4. Ctrl+F "og:image" → salin alamat gambarnya, buka di tab baru.
- Hasil yang diharapkan: judul halaman = judul artikel; description berisi potongan isi artikel; alamat og:image menampilkan foto sampul artikel itu.
- Lulus/Gagal: ☐
- Catatan: —

### UAT-31 — Meta manual menggantikan otomatis
- FR terkait: FR-12 (AC2)
- Peran penguji: Editor A + siapa pun
- Prasyarat data: artikel Terbit
- Langkah:
  1. Di halaman kelola, isi meta title artikel dengan teks khusus, mis. "Judul Meta Uji 31", simpan.
  2. Buka halaman artikel → Lihat Sumber Halaman → cari "Judul Meta Uji 31".
- Hasil yang diharapkan: tag `<title>` memuat teks manual tersebut, bukan judul artikel.
- Lulus/Gagal: ☐
- Catatan: —

### UAT-32 — Uji Rich Results Google pada artikel
- FR terkait: FR-12 (AC3)
- Peran penguji: Siapa pun
- Prasyarat data: artikel Terbit yang bisa diakses dari internet
- Langkah:
  1. Buka alat gratis Google: search.google.com/test/rich-results.
  2. Tempel alamat artikel, jalankan uji.
- Hasil yang diharapkan: alat mendeteksi data terstruktur jenis artikel tanpa error (peringatan kecil boleh dicatat).
- Lulus/Gagal: ☐
- Catatan: butuh situs sudah online; tidak bisa untuk alamat lokal.

### UAT-33 — Peta situs mengikuti siklus artikel
- FR terkait: FR-13
- Peran penguji: Siapa pun
- Prasyarat data: artikel baru yang siap diterbitkan
- Langkah:
  1. Terbitkan artikel, tunggu beberapa menit.
  2. Buka alamat `/sitemap.xml` di browser → Ctrl+F judul-rapi artikel (bagian alamatnya).
  3. Arsipkan artikel itu, tunggu beberapa menit, muat ulang `/sitemap.xml` → cari lagi.
- Hasil yang diharapkan: setelah terbit alamat artikel ADA di dalamnya; setelah diarsip alamatnya HILANG.
- Lulus/Gagal: ☐
- Catatan: —

### UAT-35 — Pratinjau tautan saat dibagikan (gambar OG)
- FR terkait: FR-15 (sumber: temuan SEO-01, KRITIS)
- Peran penguji: Siapa pun, dengan WhatsApp
- Prasyarat data: —
- Langkah:
  1. Tempel alamat BERANDA ke chat WhatsApp (grup uji) — tunggu pratinjau muncul.
  2. Ulangi dengan alamat halaman kontak dan satu halaman pengumuman.
  3. Sebagai pemeriksaan tambahan: Lihat Sumber Halaman beranda → cari "og:image" → buka alamat gambarnya di tab baru.
- Hasil yang diharapkan: setiap pratinjau menampilkan gambar dan judul (tidak polos); alamat og:image langsung menampilkan gambar, bukan halaman "tidak ditemukan".
- Lulus/Gagal: ☐
- Catatan: WhatsApp menyimpan cache pratinjau — bila hasil janggal, coba dengan menambahkan `?v=2` di akhir alamat.

### UAT-36 — Penanda dua bahasa pada tiap halaman
- FR terkait: FR-16 (AC1, AC2; sumber: SEO-02)
- Peran penguji: Siapa pun, desktop
- Prasyarat data: situs versi Indonesia & English online
- Langkah:
  1. Buka beranda versi Indonesia → Lihat Sumber Halaman → Ctrl+F "hreflang".
  2. Pastikan ada dua penanda: satu untuk "id", satu untuk "en", masing-masing menunjuk alamat yang benar.
  3. Buka beranda versi English (awalan /en) → ulangi pencarian "hreflang", lalu cari "canonical".
  4. Ulangi ketiganya pada satu halaman artikel.
- Hasil yang diharapkan: kedua versi memuat penanda id & en yang saling menunjuk; pada versi English, canonical menunjuk alamat /en itu sendiri (bukan versi Indonesia).
- Lulus/Gagal: ☐
- Catatan: —

### UAT-37 — Peta situs memuat alamat versi English
- FR terkait: FR-16 (AC3)
- Peran penguji: Siapa pun
- Prasyarat data: —
- Langkah:
  1. Buka `/sitemap.xml` → Ctrl+F "/en".
- Hasil yang diharapkan: alamat-alamat berawalan /en ikut terdaftar.
- Lulus/Gagal: ☐
- Catatan: —

### UAT-38 — Enam peristiwa terekam di Analytics
- FR terkait: FR-17 (sumber: SEO-03)
- Peran penguji: Admin/pemasaran yang punya akses Google Analytics + satu pengunjung
- Prasyarat data: akses ke laporan Realtime Google Analytics situs ini
- Langkah:
  1. Buka Google Analytics → laporan Realtime, biarkan terbuka.
  2. Di perangkat lain, sebagai pengunjung lakukan berurutan: (a) klik "Daftar Sekarang" di bagian atas beranda; (b) gulir lalu klik tombol daftar melayang (di ponsel); (c) klik tombol WhatsApp; (d) unduh satu dokumen; (e) gunakan kalkulator sampai hasil keluar; (f) klik satu artikel.
  3. Amati Realtime: enam peristiwa muncul.
- Hasil yang diharapkan: keenam peristiwa tercatat dan bisa dibedakan satu sama lain — termasuk beda antara klik daftar dari bagian atas vs tombol melayang.
- Lulus/Gagal: ☐
- Catatan: nama teknis peristiwa mengikuti TBD-08; yang diuji: semua terekam & terbedakan.

### UAT-39 — Penanda kampanye ikut sampai tombol daftar
- FR terkait: FR-18 (sumber: SEO-04)
- Peran penguji: Pengunjung
- Prasyarat data: —
- Langkah:
  1. Buka beranda dengan menambahkan di akhir alamat: `?utm_source=uji&utm_campaign=uji2027`.
  2. Klik "Daftar Sekarang" — saat halaman pendaftaran terbuka, SEGERA perhatikan bilah alamat pada permintaan pertama.
  3. Ulangi lewat tombol daftar melayang.
- Hasil yang diharapkan: alamat tujuan yang diklik memuat `utm_source=uji&utm_campaign=uji2027`.
- Lulus/Gagal: ☐
- Catatan: PENTING — per catatan verifikasi di SRS (FR-18/TBD-09), sistem pendaftaran diketahui membuang parameter ini setelah pengalihan; kelulusan dinilai pada tautan yang DIKIRIM, bukan alamat akhir. Keputusan atribusi lanjutan menunggu jawaban tim pendaftaran.

### UAT-40 — Unggahan gambar publik baru otomatis dikompres
- FR terkait: FR-19 (sumber: SEO-10)
- Peran penguji: Admin, lalu pengunjung
- Prasyarat data: foto ±2MB untuk gambar utama beranda (hero)
- Langkah:
  1. Di halaman kelola, unggah foto itu sebagai gambar utama beranda baru.
  2. Sebagai pengunjung, buka beranda; simpan gambar utama yang tampil (klik kanan → simpan).
  3. Periksa ukuran berkas yang tersimpan.
- Hasil yang diharapkan: unggahan diterima; gambar tampil di beranda; berkas yang diterima pengunjung berukuran tidak lebih dari 300KB.
- Lulus/Gagal: ☐
- Catatan: —

### UAT-41 — Daftar periksa kondisi peluncuran terisi lengkap
- FR terkait: FR-20 (sumber: SEO-13)
- Peran penguji: Penanggung jawab rilis
- Prasyarat data: situs sudah terpasang di alamat resmi
- Langkah:
  1. Minta dokumen daftar periksa peluncuran yang sudah diisi.
  2. Cocokkan empat butirnya dengan kenyataan: (a) Lihat Sumber Halaman beranda live → canonical memakai alamat resmi situs, bukan alamat percobaan; (b) laporan Realtime Analytics mencatat kunjungan uji; (c) ketik alamat situs dengan "www." dan dengan "http://" → keduanya berpindah ke satu alamat resmi ber-https; (d) butir pemeriksaan tersimpannya berkas statis tercatat hasilnya.
- Hasil yang diharapkan: keempat butir berstatus lulus dengan bukti tertulis; butir yang gagal sudah diperbaiki sebelum rilis dinyatakan selesai.
- Lulus/Gagal: ☐
- Catatan: —

---

## Ringkasan Cakupan: FR → Kasus Uji

| FR | Kasus uji | Jumlah |
|---|---|---|
| FR-01 | UAT-01, UAT-02 | 2 |
| FR-02 | UAT-03, UAT-04, UAT-05, UAT-24 | 4 |
| FR-03 | UAT-06, UAT-07, UAT-08, UAT-19 | 4 |
| FR-04 | UAT-09 | 1 |
| FR-05 | UAT-10 | 1 |
| FR-06 | UAT-11, UAT-20 | 2 |
| FR-07 | UAT-12 | 1 |
| FR-08 | UAT-13, UAT-14, UAT-15, UAT-16 | 4 |
| FR-09 | UAT-25 | 1 |
| FR-10 | UAT-26, UAT-27 | 2 |
| FR-11 | UAT-28, UAT-29 | 2 |
| FR-12 | UAT-30, UAT-31, UAT-32 | 3 |
| FR-13 | UAT-33 (+UAT-24 langkah 2) | 1 |
| FR-14 | UAT-17, UAT-18, UAT-19 | 3 |
| FR-15 | UAT-35 | 1 |
| FR-16 | UAT-36, UAT-37 | 2 |
| FR-17 | UAT-38 | 1 |
| FR-18 | UAT-39 | 1 |
| FR-19 | UAT-40 (+UAT-16) | 1 |
| FR-20 | UAT-41 | 1 |
| FR-21 | UAT-34 | 1 |
| §6 hak akses | UAT-18, UAT-21, UAT-22, UAT-23 | 4 |
| §7 kondisi tepi | UAT-08, UAT-13, UAT-17, UAT-19, UAT-20, UAT-24 | 6 |

Semua 21 FR tercakup; setiap acceptance criteria SRS punya minimal satu kasus. Total 41 kasus uji. Kondisi tepi TBD-06 (jadwal berwaktu lampau) dan TBD-07 (hapus kategori terpakai) belum punya kasus uji karena perilakunya belum diputuskan di SRS — tambahkan kasusnya begitu TBD ditutup.
