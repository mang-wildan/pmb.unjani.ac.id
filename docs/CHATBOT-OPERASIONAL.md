# Operasional chatbot admisi

## Prasyarat aktivasi

1. Operator menetapkan `CHATBOT_ENCRYPTION_KEY` pada environment server: 32 byte acak, ditulis sebagai 64 karakter heksadesimal. Buat dengan `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Simpan sebagai rahasia; jangan masukkan nilainya ke Git, log, atau percakapan. Agent tidak mengubah `.env`.
2. Restart proses aplikasi setelah menetapkan environment. Tanpa kunci valid, penyimpanan API key baru ditolak. Simpan cadangan kunci secara aman: menggantinya membuat API key lama tidak dapat didekripsi. Rotasi otomatis belum tersedia.
3. Superadmin membuka `/admin/pengaturan`, memilih satu provider (OpenRouter, DeepSeek API, atau Gemini API), mengisi model dan API key provider tersebut. Tidak ada perpindahan otomatis saat provider gagal.
4. Tinjau dan aktifkan sumber resmi. Baris ProgramStudi dan Biaya lama yang belum memiliki field `aktif` tidak digunakan chatbot. Aktifkan per baris melalui `/admin/program-studi` dan `/admin/biaya` setelah ditinjau; tidak ada backfill otomatis. Biaya juga memerlukan prodi, jalur, dan jadwal terkait yang aktif.
5. Pastikan nomor WhatsApp pada pengaturan benar. Jika kosong, widget mengarahkan eskalasi ke halaman kontak. Saat chatbot OFF, tombol WhatsApp lama tetap berlaku.
6. Aktifkan chatbot setelah konfigurasi dan sumber siap. Penggunaan provider nyata dapat menimbulkan biaya.

## Perilaku dan batas MVP

- Sumber nonaktif tidak digunakan. Jadwal aktif yang sudah lewat tetap dapat dijawab sebagai pendaftaran ditutup.
- PDF hanya metadata dan tautan; tidak ada ekstraksi teks atau OCR. Jawaban prosedur menggunakan FAQ aktif.
- Jawaban memilih kalimat sumber; bukan parafrasa bebas. Sumber tidak cukup atau konflik yang terdeteksi menghasilkan penolakan/eskalasi. Deteksi konflik semantik menyeluruh belum tersedia.
- Total biaya sampai lulus dan masa studi tidak ditebak.
- Setelah ambang balasan, widget menanyakan kepuasan. Pilihan Belum menampilkan kontak. Gangguan/sumber kosong langsung menawarkan kontak. WhatsApp tidak dibuka otomatis.
- Riwayat disimpan sementara pada `sessionStorage` browser. Jangan masukkan data pribadi atau kredensial ke chat: pesan dikirim ke provider aktif untuk diproses.
- Batas permintaan: 15 per menit per IP, penghitung dalam memori per proses. Beberapa proses memiliki penghitung terpisah. Reverse proxy harus mengganti header IP/host dari klien dengan nilai tepercaya; jangan mengekspos port Node langsung ke publik.

## Verifikasi

- Uji offline: `node scripts/check-chatbot.mjs`, `node scripts/check-chatbot-route.mjs`, `node scripts/check-chatbot-settings.mjs`.
- Validasi dataset: `node scripts/eval-chatbot.mjs --dry-run`.
- Setelah provider siap dan penggunaan disetujui, jalankan `node scripts/eval-chatbot.mjs --slow` pada server lokal (lihat `--help` untuk URL). Run nyata belum dilakukan oleh agent.
- Harness memeriksa kontrak respons dan keberadaan sumber, bukan akurasi/relevansi fakta. Hasil hijau tidak membuktikan akurasi 90%. Bandingkan jawaban dengan sumber resmi secara manual sebelum publikasi; nominal/tanggal harus tepat dan semua tautan valid.
- Uji browser desktop/mobile, keyboard, buka/tutup widget, sumber, reload sesi, ambang kepuasan, serta fallback WhatsApp sebelum peluncuran.
