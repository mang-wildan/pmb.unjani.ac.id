# TODO v1.4.0 — Papan Task Perbaikan SEO

> **Untuk agent pelaksana:** gunakan `superpowers:subagent-driven-development` (disarankan) atau `superpowers:executing-plans`, satu task per giliran. Desain lengkap ada di `SPEC.md` (folder ini). Baca SPEC dulu, karena TODO ini hanya merujuk nomor FR, keputusan D-xx, dan bagian §-nya.

- **Tujuan:** setiap niat pencarian utama punya URL sendiri, dan kebocoran SEO teknis dari `AUDIT-SEO.md` tertutup.
- **Arsitektur:** empat halaman server-rendered baru memakai ulang komponen beranda. Redirect URL lama dipindah ke `next.config.mjs`. Metadata dan structured data dirapikan di `src/lib/seo.ts`. Sisanya dikerjakan di nginx dan CMS.
- **Stack:** Next.js 16 App Router, next-intl (id/en), Mongoose, Tailwind.

---

## Cara pakai papan ini

1. **Status:** `[ ]` belum dikerjakan, `[x]` sudah selesai dan verifikasinya lulus.
2. **Urutan:** kerjakan dari atas ke bawah. Task boleh dimulai hanya bila semua ID di kolom `butuh` sudah `[x]`. Fase 3 (manusia) boleh berjalan paralel setelah T.1.0.
3. **Selesai:** task baru boleh dicentang setelah semua langkah verifikasinya menghasilkan output yang diharapkan. Setelah itu isi `agent:` (nama atau sesi) dan `commit:`.
   - Folder ini bukan repo git. Bila sudah menjadi repo, satu task = satu commit, dan kolom diisi hash pendek.
   - Bila belum, isi `-`.
4. **Verifikasi gagal:** berhenti. Jangan lanjut ke task berikutnya. Buka kembali task penyebabnya.
5. **Task membengkak:** bila task ternyata menyentuh lebih dari ±150 baris, berhenti dan pecah dulu di file ini.
6. **Tanda:**
   - `[SEO-IRREVERSIBLE]` = efeknya menempel di indeks Google. Baca SPEC §7 dulu.
   - `[MANUSIA]` = dikerjakan admin server, admin CMS, atau pemilik produk, bukan agent.
7. **Saran model dan effort** (parameter `model` dan `effort` Claude Code):

| Model | Untuk |
|---|---|
| `claude-haiku-5-5` | Perubahan mekanis di 1–2 file, teks, atau config |
| `claude-sonnet-5-5` | Halaman atau komponen baru, refactor kecil lintas file |
| `claude-opus-5-5` | Perubahan `[SEO-IRREVERSIBLE]` lintas file, dan checkpoint regresi |

   Effort: `low` untuk perubahan mekanis, `medium` untuk logika atau lintas file, `high` untuk checkpoint rilis.

## Batasan global

- Tidak menambah atau meng-upgrade dependency.
- Tidak menyentuh `.env`, config auth, maupun migration lama.
- Tidak mengubah skema DB.
- Kunci i18n `messages/id.json` dan `messages/en.json` selalu ditambah bersamaan. Teksnya persis seperti SPEC §6.4.
- Komentar dan dokumen berbahasa Indonesia. Ikuti pola yang ada: `connectDb`, `buildMetadata`, `JsonLd`, `SectionHeading level={1}`, `revalidate = 60`.
- Tidak ada framework test. Verifikasi memakai `npx tsx -e` (assert), `curl`, `npx tsc --noEmit`, `yarn lint`, dan `yarn build`.

## Fokus review (input yang paling mungkin merusak)

1. **Slug lama berubah saat jalur atau kategori diedit.** `PUT` memanggil `toSlug` pada slug yang sudah ada, sehingga `toSlug` wajib idempoten. Diuji di T.1.9.
2. **Varian redirect.** `/en/jadwal` harus berakhir di `/en/jadwal-pmb`, `/jadwal/` (trailing slash) harus tiba dalam ≤ 2 hop, dan tidak boleh ada loop. Diuji di T.2.5.
3. **Data kosong.** Nol biaya aktif, nol FAQ, atau nol jadwal harus menghasilkan `200` dengan keadaan kosong, bukan error atau tabel kosong. Diuji di T.2.1, T.2.3, dan T.2.4.
4. **MongoDB mati.** Halaman baru tidak boleh 500. Diuji di T.2.7.
5. **Konten `/en` tanpa `judul_en`.** Harus `noindex` dan keluar dari sitemap. Konten yang punya `judul_en` tetap terindeks. Diuji di T.1.4.

## Persiapan uji lokal

```bash
yarn dev                      # port 9532; butuh MongoDB lokal berisi data (yarn seed bila kosong)
B=http://localhost:9532       # semua perintah curl di bawah dijalankan di Git Bash
P=https://pmb.unjani.ac.id
```

Data dev minimal:
- ≥ 1 jadwal aktif yang punya biaya
- ≥ 2 jalur aktif
- ≥ 1 FAQ per kategori
- 1 pengumuman tanpa `judul_en` (slug `S1`) dan 1 pengumuman dengan `judul_en` (slug `S2`)

Untuk cek yang hanya boleh menghitung DOM (bukan payload RSC di `<script>`), pakai versi HTML tanpa script:

```bash
curl -s $B/ | perl -0pe 's/<script\b.*?<\/script>//gs' > /tmp/b-dom.html
```

---

## FASE 1 — Fondasi (perbaikan kecil, belum ada halaman baru)

- [x] **T.1.0** Gerbang keputusan `[MANUSIA]`
  - **butuh:** - · **model:** — (pemilik produk) · **effort:** - · **agent:** claude-sonnet-5-5 (dicatat atas perintah pemilik) · **commit:** a0463eb
  1. Pemilik menyetujui atau mengoreksi D-02 sampai D-11 di SPEC §3. Kolom "Asal" diganti menjadi `Pemilik, <tanggal>`.

- [x] **T.1.1** Baseline sebelum perubahan
  - **file:** `docs/update/v.1.4.0/RILIS-CHECKLIST.md` (buat) · **butuh:** - · **model:** `claude-haiku-5-5` · **effort:** `low` · **agent:** claude-sonnet-5-5 · **commit:** 69a7fc3
  1. Buat RILIS-CHECKLIST.md dengan bagian "Baseline 1.4.0". Tempel output perintah berikut apa adanya:
     ```bash
     curl -sI http://pmb.unjani.ac.id/ | head -3
     curl -sI https://www.pmb.unjani.ac.id/ | head -3
     curl -sI $P/ | grep -i -E '^(link|strict-transport-security):'
     curl -s $P/ | grep -o '<title>[^<]*'
     curl -s $P/robots.txt
     curl -s $P/sitemap.xml | grep -c '<loc>'
     curl -s $P/ | grep -c 'fetchpriority="high"'
     curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' -H 'Accept-Language: en' $P/
     yarn lint 2>&1 | tail -3      # jumlah warning lokal = baseline lint
     ```
  2. Expected: semua output tercatat. Tidak ada perubahan di kode.

- [x] **T.1.2** robots.txt: izinkan PDF publik dan hapus `Host` — FR-SEO-03
  - **file:** `src/app/robots.ts` · **butuh:** T.1.0 · **model:** `claude-haiku-5-5` · **effort:** `low` · **agent:** claude-sonnet-5-5 · **commit:** 078a7ba
  1. Ubah sesuai FR-SEO-03.
  2. Cek: `curl -s $B/robots.txt` memuat `Allow: /api/files/` dan `Disallow: /api`, tanpa baris `Host:`.

- [x] **T.1.3** `buildMetadata`: x-default, `og:locale`, dan opsi `hanyaId` — FR-SEO-04 butir 1–3 `[SEO-IRREVERSIBLE]`
  - **file:** `src/lib/seo.ts` · **butuh:** T.1.0 · **model:** `claude-opus-5-5` · **effort:** `medium` · **agent:** claude-sonnet-5-5 · **commit:** 05576cd
  1. Jalankan cek di bawah. Expected sebelum perubahan: `AssertionError`.
     ```bash
     npx tsx -e 'Promise.all([import("node:assert"), import("./src/lib/seo.ts")]).then(([{ default: a }, { buildMetadata: b, SITE_URL: u }]) => {
       const m = b({ path: "/kontak", locale: "en" });
       a.equal(m.alternates.languages["x-default"], u + "/kontak");
       a.equal(m.openGraph.locale, "en_US");
       a.equal(b({ path: "/kontak", locale: "id" }).openGraph.locale, "id_ID");
       const h = b({ path: "/pengumuman/x", locale: "en", hanyaId: true });
       a.deepEqual(Object.keys(h.alternates.languages).sort(), ["id", "x-default"]);
       a.equal(h.robots.index, false);
       a.equal(b({ path: "/pengumuman/x", locale: "id", hanyaId: true }).robots.index, true);
       console.log("LULUS"); })'
     ```
  2. Implementasikan sesuai SPEC §6.2. `seo.ts` hanya boleh memakai `import type` agar tetap bebas Mongoose.
  3. Jalankan ulang cek. Expected: `LULUS`. Lalu `npx tsc --noEmit` harus bersih.

- [x] **T.1.4** Bahasa: matikan deteksi browser, dan `/en` tanpa terjemahan jadi noindex — FR-SEO-04 butir 4–6 `[SEO-IRREVERSIBLE]`
  - **file:** `src/i18n/routing.ts`, `src/app/[locale]/(public)/pengumuman/[slug]/page.tsx`, `src/app/[locale]/(public)/artikel/[slug]/page.tsx`, `src/app/sitemap.ts` · **butuh:** T.1.3 · **model:** `claude-opus-5-5` · **effort:** `medium` · **agent:** claude-sonnet-5-5 · **commit:** 82ecdba
  1. Tambah `localeDetection: false` di `routing.ts`.
  2. Di `generateMetadata` kedua halaman detail: ikut-select `judul_en`, lalu teruskan `hanyaId: !doc.judul_en?.trim()`.
  3. Di sitemap: `localizedEntries(path, data, adaEn = true)`, select `judul_en`, dan teruskan `Boolean(item.judul_en?.trim())`.
  4. Cek:
     ```bash
     curl -s -o /dev/null -w '%{http_code}\n' -H 'Accept-Language: en' $B/   # 200
     curl -s $B/en/pengumuman/S1 | grep -c noindex                        # ≥1
     curl -s $B/en/pengumuman/S2 | grep -c noindex                        # 0
     curl -s $B/pengumuman/S1 | grep -c 'hreflang="en"'                   # 0
     curl -s $B/sitemap.xml | grep -c '/en/pengumuman/S1<'                # 0
     curl -s $B/sitemap.xml | grep -c '/en/pengumuman/S2<'                # 1
     ```

- [x] **T.1.5** Title dan meta beranda, plus meta description pendek — FR-SEO-04 butir 7–8 (P1, M5)
  - **file:** `src/app/[locale]/(public)/page.tsx` (`generateMetadata`), `messages/id.json`, `messages/en.json` · **butuh:** T.1.3 · **model:** `claude-sonnet-5-5` · **effort:** `low` · **agent:** claude-sonnet-5-5 · **commit:** 657e0b6
  1. Tambah atau ubah kunci `home.metaTitleSufiks`, `home.metaDesc`, `pengumumanPage.metaDesc`, `kontakPage.metaDesc`, dan `artikelPage.metaDesc`, persis SPEC §6.4.
  2. Di `generateMetadata`:
     - Baca `PageContent.findOne({ kunci: 'hero' }).select('data').lean()` dengan `.catch(() => null)`. Sebelumnya: `connectDb().catch(() => null)`.
     - `title.absolute = ['PMB UNJANI', tahun].filter(Boolean).join(' ') + ' – ' + t('metaTitleSufiks')`.
     - Samakan `openGraph.title` dan `twitter.title` dengan title tersebut.
  3. Cek:
     - `curl -s $B/ | grep -o '<title>[^<]*'` menghasilkan `PMB UNJANI <tahunAjaran> – Pendaftaran Kuliah di Cimahi &amp; Bandung`.
     - `curl -s $B/en | grep -o '<title>[^<]*'` diakhiri `Study in Cimahi &amp; Bandung, Indonesia`.
     - `curl -s $B/kontak | grep -o '<meta name="description" content="[^"]*"'` menampilkan teks §6.4.

- [ ] **T.1.6** Structured data: logo, Organization, Article, NewsArticle — FR-SEO-05
  - **file:** `src/lib/seo.ts`, `src/app/layout.tsx`, `src/app/[locale]/(public)/kontak/page.tsx`, `.../artikel/[slug]/page.tsx`, `.../pengumuman/[slug]/page.tsx` · **butuh:** T.1.3 · **model:** `claude-sonnet-5-5` · **effort:** `medium` · **agent:** - · **commit:** -
  1. Tambah `LOGO_URL` dan `organizationJsonLd(settings)` dengan bentuk SPEC §6.5.
  2. Di `layout.tsx`, ganti kedua `<Script afterInteractive>` dengan `<JsonLd data={[organizationJsonLd(settings), websiteJsonLd()]} />`.
  3. Hapus `organizationJsonLd()` dari `/kontak`.
  4. Di Article dan NewsArticle: pakai `LOGO_URL`, author bertipe `Organization`, dan `dateModified = new Date(Math.max(+publishedAt, +updatedAt)).toISOString()`.
  5. Cek:
     ```bash
     grep -rn 'logo.svg' src                                                   # kosong
     curl -s $B/ | grep -o '"@type":"CollegeOrUniversity"' | wc -l           # 1
     curl -s $B/kontak | grep -o '"@type":"CollegeOrUniversity"' | wc -l     # 1
     curl -s $B/ | grep -c 'id="jsonld-org"'                                 # 0
     curl -sI "$B/logo-pmb-unjani%20(1).png" | head -1                       # 200
     curl -s $B/artikel/<slug-terbit> | grep -o '"date\(Published\|Modified\)":"[^"]*"'   # Modified ≥ Published
     ```

- [ ] **T.1.7** Markup ramah crawler: heading jalur dan FAQ, angka hero statis — FR-SEO-06 butir 1–3
  - **file:** `src/components/public/JalurAccordion.tsx`, `JalurList.tsx`, `FAQAccordion.tsx`, `Hero.tsx`, `messages/*.json` (`jalurPage.persyaratan`) · **butuh:** T.1.0 · **model:** `claude-sonnet-5-5` · **effort:** `medium` · **agent:** - · **commit:** -
  1. Implementasikan FR-SEO-06 butir 1–3. Props baru: `JalurAccordion`/`JalurList` mendapat `tingkatJudul?: 'h2' | 'h3'`, dan `FAQAccordion` mendapat `tampilkanTab?: boolean`. Default keduanya mempertahankan perilaku beranda.
  2. Ambil HTML tanpa script (lihat Persiapan), lalu cek:
     ```bash
     grep -c '>Persyaratan</h3>' /tmp/b-dom.html                              # 0
     grep -o '<h3[^>]*><button' /tmp/b-dom.html | wc -l                       # ≥ jumlah jalur aktif
     grep -o '<ringkasan salah satu jalur>' /tmp/b-dom.html | wc -l           # 1
     perl -ne 'print "$1\n" while /<dd[^>]*>(\d+)<\/dd>/g' /tmp/b-dom.html     # jumlah fakultas lalu prodi
     ```
  3. Cek manual di browser: accordion jalur dan FAQ tetap bisa dibuka dan ditutup dengan mouse dan keyboard (Tab, Enter).

- [ ] **T.1.8** Link WhatsApp di kontak dan ejaan — FR-SEO-07
  - **file:** `src/app/[locale]/(public)/kontak/page.tsx:94`, `src/app/[locale]/(public)/page.tsx:583`, `src/components/public/WhatsAppFloatingButton.tsx:5` · **butuh:** T.1.0 · **model:** `claude-haiku-5-5` · **effort:** `low` · **agent:** - · **commit:** -
  1. Ubah sesuai FR-SEO-07.
  2. Cek:
     - `curl -s $B/kontak | grep -o 'wa.me/[0-9]*'` → semua diawali `wa.me/62`.
     - `grep -rn Universtas src` → kosong.

- [x] **T.1.9** `toSlug`: potong per kata, tanpa `&`→`and`, dan idempoten — FR-SEO-08
  - **file:** `src/lib/slug.ts` · **butuh:** T.1.0 · **model:** `claude-sonnet-5-5` · **effort:** `low` · **agent:** claude-sonnet-5-5 · **commit:** 05576cd
  1. Jalankan cek di bawah. Expected sebelum perubahan: `AssertionError` di assert pertama.
     ```bash
     npx tsx -e 'Promise.all([import("node:assert"), import("./src/lib/slug.ts")]).then(([{ default: a }, { toSlug: s }]) => {
       a.equal(s("PMB UNJANI 2027/2028 : PMDK 1 & GELOMBANG 1 DIBUKA!"), "pmb-unjani-2027-2028-pmdk-1-gelombang-1-dibuka");
       a.equal(s("a".repeat(78) + " bcd"), "a".repeat(78));
       a.equal(s("b".repeat(90)), "b".repeat(80));
       a.equal(s("kata ".repeat(20)).endsWith("-"), false);
       for (const v of ["pmdk", "kip-kuliah", "a".repeat(80)]) a.equal(s(v), v);
       const x = s("Pendaftaran Gelombang 6 TA. 2026/2027 dibuka 26 Juli hingga 29 Agustus 2026 & potongan Rp275.000");
       a.ok(x.length <= 80); a.equal(s(x), x);
       console.log("LULUS"); })'
     ```
  2. Implementasikan sesuai FR-SEO-08.
  3. Jalankan ulang cek. Expected: `LULUS`.

- [ ] **T.1.10** Prioritas gambar hero (bersyarat) — FR-SEO-06 butir 4
  - **file:** `src/components/public/HeroSlider.tsx` (hanya bila perlu) · **butuh:** T.1.1 · **model:** `claude-haiku-5-5` · **effort:** `low` · **agent:** - · **commit:** -
  1. Lihat hasil `fetchpriority` di baseline T.1.1, lalu cek dev: `curl -s $B/ | grep -c 'fetchpriority="high"'`.
  2. Bila hasilnya ≥ 1: centang task tanpa perubahan, dan catat "tidak perlu" di RILIS-CHECKLIST.
  3. Bila 0: tambahkan `fetchPriority={indeks === 0 ? 'high' : undefined}` pada `<Image>`, lalu cek ulang. Expected: ≥ 1.

- [ ] **T.1.11** CHECKPOINT FASE 1
  - **file:** `RILIS-CHECKLIST.md` · **butuh:** T.1.2 sampai T.1.10 · **model:** `claude-sonnet-5-5` · **effort:** `medium` · **agent:** - · **commit:** -
  1. `npx tsc --noEmit` bersih. `yarn lint`: 0 error dan jumlah warning tidak melebihi baseline T.1.1. `yarn build` sukses.
  2. Ulangi semua cek T.1.2–T.1.10, lalu tempel outputnya ke RILIS-CHECKLIST.
  3. Regresi: `/`, `/en`, `/pengumuman`, `/artikel`, `/kontak`, dan `/admin/login` mengembalikan `200`. Kalkulator beranda masih bisa menghitung.

---

## FASE 2 — Halaman topik (K2)

- [ ] **T.2.0** Ekstrak data biaya ke `src/lib/dataBiaya.ts`, tanpa mengubah perilaku
  - **file:** `src/lib/dataBiaya.ts` (buat), `src/app/[locale]/(public)/page.tsx` · **butuh:** T.1.11 · **model:** `claude-sonnet-5-5` · **effort:** `medium` · **agent:** - · **commit:** -
  1. Simpan HTML section kalkulator sebelum perubahan:
     ```bash
     curl -s $B/ | perl -0ne 'print $1 if /(<section id="kalkulator".*?<\/section>)/s' > /tmp/kalk-sebelum.html
     ```
  2. Buat file baru:
     - `muatDataBiaya(acuan?: Date): Promise<DataBiaya>` sesuai SPEC §6.2. Isinya dipindah dari `page.tsx:173-196` dan `211-277`. Awal hari diambil dari `batasHari(acuan).awal` (`src/lib/statusPeriode.ts`).
     - `muatKalkulatorKosong(locale: string): Promise<KalkulatorKosong>`, dipindah dari `page.tsx:287-297`. Fungsi ini memakai `loadSiteSettings()` (sudah di-cache React) dan `getTranslations({ locale, namespace: 'home' })`.
  3. Beranda memakai kedua fungsi itu. `prodiBerbiaya` tetap diturunkan dari `records`.
  4. Ulangi perintah langkah 1 ke `/tmp/kalk-sesudah.html`, lalu `diff /tmp/kalk-sebelum.html /tmp/kalk-sesudah.html`. Expected: tidak ada output.

- [ ] **T.2.1** Halaman `/biaya-kuliah` dan `TabelBiaya` — FR-SEO-09
  - **file:** `src/app/[locale]/(public)/biaya-kuliah/page.tsx` (buat), `src/components/public/TabelBiaya.tsx` (buat), `messages/*.json` (`biayaPage.*`) · **butuh:** T.2.0 · **model:** `claude-sonnet-5-5` · **effort:** `medium` · **agent:** - · **commit:** -
  1. Tambah kunci `biayaPage` dari SPEC §6.4: `metaTitle`, `metaDesc`, `desc`, `tabelJudul`, dan `kolom*`.
  2. Buat `TabelBiaya` sesuai SPEC §6.2, lalu halaman sesuai baris `/biaya-kuliah` di FR-SEO-09.
  3. Cek dengan data biaya aktif:
     ```bash
     for u in /biaya-kuliah /en/biaya-kuliah; do curl -s -o /dev/null -w "$u %{http_code}\n" $B$u; done   # 200 200
     curl -s $B/biaya-kuliah | grep -o '<h1' | wc -l                       # 1
     curl -s $B/biaya-kuliah | grep -o '<title>[^<]*'                      # Biaya Kuliah UNJANI per Program Studi — PMB UNJANI
     curl -s $B/biaya-kuliah | grep -o '<link rel="canonical" href="[^"]*"' # .../biaya-kuliah
     curl -s $B/biaya-kuliah | grep -c '<table'                            # ≥1
     ```
  4. Cek data kosong: nonaktifkan semua jadwal di admin dev. Expected: `200`, `grep -c '<table'` = `0`, dan `grep -c '/api/files/'` ≥ 1. Setelah itu aktifkan kembali jadwalnya.

- [ ] **T.2.2** Halaman `/jalur-masuk` — FR-SEO-09
  - **file:** `src/app/[locale]/(public)/jalur-masuk/page.tsx` (buat), `messages/*.json` (`jalurPage.metaTitle`, `metaDesc`) · **butuh:** T.1.7, T.1.11 · **model:** `claude-sonnet-5-5` · **effort:** `low` · **agent:** - · **commit:** -
  1. Buat halaman sesuai baris `/jalur-masuk` di FR-SEO-09. Query: `JalurSeleksi.find({ aktif: true }).sort({ urutan: 1, nama: 1 }).lean().catch(() => [])`.
  2. Cek:
     - `/jalur-masuk` dan `/en/jalur-masuk` mengembalikan `200`.
     - Jumlah `<h1` = 1.
     - Di HTML tanpa script, jumlah `<h2[^>]*><button` = jumlah jalur aktif.
     - Title = `Jalur Masuk UNJANI dan Persyaratannya — PMB UNJANI`.
     - `$B/jalur-masuk#<slug-jalur>` di browser menggulir ke jalur tersebut.

- [ ] **T.2.3** Halaman `/jadwal-pmb` — FR-SEO-09
  - **file:** `src/app/[locale]/(public)/jadwal-pmb/page.tsx` (buat), `src/components/public/JadwalTable.tsx`, `messages/*.json` (`jadwalPage.metaTitle`, `metaDesc`) · **butuh:** T.1.11 · **model:** `claude-sonnet-5-5` · **effort:** `low` · **agent:** - · **commit:** -
  1. Ubah kolom status `JadwalTable` sesuai baris `/jadwal-pmb` di FR-SEO-09. Komponen ini belum dipakai di mana pun, jadi aman diubah.
  2. Buat halamannya.
  3. Cek:
     - `200` untuk id dan en, dengan tepat 1 `<h1`.
     - Tabel memuat `Sedang berlangsung` atau `Mulai dalam`.
     - Data kosong: nonaktifkan semua jadwal di admin dev. Expected: `200` dan memuat `Belum ada jadwal dipublikasikan.`

- [ ] **T.2.4** Halaman `/faq` dan FAQPage JSON-LD — FR-SEO-09
  - **file:** `src/app/[locale]/(public)/faq/page.tsx` (buat), `src/lib/seo.ts` (`faqPageJsonLd`), `messages/*.json` (`faqPage.*`) · **butuh:** T.1.7, T.1.11 · **model:** `claude-sonnet-5-5` · **effort:** `low` · **agent:** - · **commit:** -
  1. Jalankan `npx tsx -e` dengan assert `faqPageJsonLd([]) === null`, dan `faqPageJsonLd([{ pertanyaan: "Q", jawaban: "A" }]).mainEntity[0].acceptedAnswer.text === "A"`. Expected sebelum implementasi: gagal.
  2. Implementasikan `faqPageJsonLd` dan halaman sesuai baris `/faq` di FR-SEO-09. Jalankan ulang assert. Expected: lulus.
  3. Cek:
     - `200` untuk id dan en, dengan tepat 1 `<h1`.
     - `grep -o '"@type":"Question"' | wc -l` = jumlah FAQ aktif.
     - Di HTML tanpa script, jumlah `<h3[^>]*><button` = jumlah FAQ aktif.
  4. Data kosong: nonaktifkan semua FAQ. Expected: `200` dan `grep -c FAQPage` = `0`. Setelah itu aktifkan kembali.

- [ ] **T.2.5** Hapus 3 folder lama dan pindahkan redirect ke `next.config.mjs` — FR-SEO-02, D-01 `[SEO-IRREVERSIBLE]`
  - **file:** hapus `src/app/[locale]/(public)/jalur-seleksi/`, `biaya-pendidikan/`, `jadwal/`; ubah `next.config.mjs` · **butuh:** T.2.1 sampai T.2.4 · **model:** `claude-opus-5-5` · **effort:** `medium` · **agent:** - · **commit:** -
  1. Cadangkan folder proyek (zip), karena folder ini bukan repo git.
  2. Hapus ketiga folder. Tambahkan `async redirects()` berisi tabel SPEC §6.3. Restart `yarn dev`.
  3. Cek semua rule:
     ```bash
     while read s d; do r=$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' "$B$s"); [ "$r" = "308 $B$d" ] && echo "OK $s" || echo "GAGAL $s -> $r"; done <<'EOF'
     /jalur-seleksi /jalur-masuk
     /en/jalur-seleksi /en/jalur-masuk
     /biaya-pendidikan /biaya-kuliah
     /en/biaya-pendidikan /en/biaya-kuliah
     /jadwal /jadwal-pmb
     /en/jadwal /en/jadwal-pmb
     /prodi /
     /infomasi-biaya /biaya-kuliah
     /semuajalur /jalur-masuk
     /jalur-lanjutan /jalur-masuk
     /jalur-pmdk-3 /jalur-masuk
     /jalur-magister /jalur-masuk
     /jalur-ods /pengumuman/mekanisme-ods
     /jadwal-pmb-september /jadwal-pmb
     EOF
     ```
     Expected: semua baris `OK`.
  4. Cek tambahan:
     ```bash
     curl -sL -o /dev/null -w '%{http_code} %{num_redirects}\n' $B/jadwal/      # 200, redirect ≤ 2
     curl -s -o /dev/null -w '%{http_code}\n' $B/kalkulator                       # 308 (stub D-11 tidak berubah)
     curl -s -o /dev/null -w '%{http_code}\n' $B/halaman-tidak-ada-xyz            # 404
     ls "src/app/[locale]/(public)"                                               # tanpa jalur-seleksi, biaya-pendidikan, jadwal
     ```

- [ ] **T.2.6** Internal link dan sitemap — FR-SEO-10
  - **file:** `src/components/public/Navbar.tsx`, `Footer.tsx`, `src/app/[locale]/(public)/page.tsx`, `src/app/sitemap.ts`, `messages/*.json` (`home.biayaLink`, `home.faqLink`, `footer.faq`) · **butuh:** T.2.1 sampai T.2.4 · **model:** `claude-sonnet-5-5` · **effort:** `low` · **agent:** - · **commit:** -
  1. Ubah sesuai FR-SEO-10 butir 1–4.
  2. Cek:
     ```bash
     curl -s $B/sitemap.xml | grep -c -E '/(biaya-kuliah|jalur-masuk|jadwal-pmb|faq)</loc>'   # 8
     curl -s $B/kontak | grep -c -E 'href="/#(jalur|kalkulator)"'                            # 0
     curl -s $B/ | grep -o -E 'href="/(jalur-masuk|jadwal-pmb|biaya-kuliah|faq)"' | sort -u   # 4 baris
     curl -s $B/en | grep -c 'href="/en/jalur-masuk"'                                        # ≥1
     ```

- [ ] **T.2.7** CHECKPOINT FASE 2 dan fokus review
  - **file:** `RILIS-CHECKLIST.md` · **butuh:** T.2.5, T.2.6 · **model:** `claude-opus-5-5` · **effort:** `high` · **agent:** - · **commit:** -
  1. `npx tsc --noEmit`, `yarn lint` (tidak melebihi baseline), dan `yarn build` harus sukses. Lalu jalankan `yarn start` (port 9532).
  2. Ulangi semua cek T.1.x dan T.2.x terhadap build production lokal. Tempel hasilnya ke RILIS-CHECKLIST.
  3. Fokus review butir 1, 2, 3, dan 5: rujuk hasil T.1.9, T.2.5, T.2.1/T.2.3/T.2.4, dan T.1.4.
  4. Fokus review butir 4: matikan service MongoDB, lalu `curl` keempat halaman baru dan `/`. Expected: tidak ada `500`. Setelah itu nyalakan kembali MongoDB.
  5. Regresi manual di desktop dan ponsel: beranda (semua section, kalkulator, popup), navbar, footer, language switcher, dan login admin.

---

## FASE 3 — Server dan konten `[MANUSIA]` (boleh paralel setelah T.1.0)

- [ ] **T.3.0** nginx: HTTPS dan apex, satu hop — FR-SEO-01 `[MANUSIA]` `[SEO-IRREVERSIBLE]`
  - **butuh:** T.1.0 · **model:** — (admin server) · **effort:** - · **agent:** - · **commit:** -
  1. Terapkan SPEC §6.6, termasuk menghapus rule www→http yang lama. Jalankan `nginx -t`, lalu reload.
  2. Cek kriteria terima FR-SEO-01, lalu tempel output ke RILIS-CHECKLIST.

- [ ] **T.3.1** Perbaiki link di konten CMS — P5 `[MANUSIA]`
  - **butuh:** T.1.0 · **model:** — (admin CMS) · **effort:** - · **agent:** - · **commit:** -
  1. Periksa deskripsi Jalur Seleksi, jawaban FAQ, isi Artikel, dan isi Pengumuman. Ganti:
     - `https://exam.pmb.unjani.ac.id/` → `https://exam-pmb.unjani.ac.id/`
     - `http://pendaftaran.unjani.ac.id/` → `https://pendaftaran.unjani.ac.id/register`
     - `http://s.unjani.ac.id/bukuperaturanakademik` → URL HTTPS final yang sudah dicek manual di browser
  2. Status `503` di `exam-pmb` dikoordinasikan dengan tim ujian (halaman info saat tidak ada ujian). Ini di luar repo.
  3. Cek (tunggu ≥ 60 detik untuk ISR): `curl -s $P/ | grep -c -E 'exam\.pmb|http://pendaftaran|http://s\.unjani'` → `0`.

- [ ] **T.3.2** Pengumuman beranda 2027/2028 — P6 `[MANUSIA]`
  - **butuh:** T.1.0 · **model:** — (admin CMS) · **effort:** - · **agent:** - · **commit:** -
  1. Terbitkan pengumuman resmi PMB 2027/2028 dan pin.
  2. Untuk pengumuman Gelombang 6 dan Pembukaan 2026/2027: lepas pin, lalu nonaktifkan atau beri awalan `(Ditutup)` di judul.
  3. Cek: blok Pengumuman di `$P/` menampilkan pengumuman 2027/2028 di urutan pertama.

- [ ] **T.3.3** Artikel: isi, meta, kategori, penulis — P7, M3, M4, M6, M7, M8 `[MANUSIA]`
  - **butuh:** T.2.6 (link ke halaman baru) · **model:** — (admin CMS) · **effort:** - · **agent:** - · **commit:** -
  1. Artikel "PMB UNJANI 2027/2028":
     - Judul dalam sentence case.
     - `metaDescription` 140–160 karakter yang memuat tanggal, jalur, dan kata "Cimahi".
     - Isi ditambah: tabel jadwal (8 Okt 2026 – 2 Jan 2027), syarat, dan biaya pendaftaran PMDK (verifikasi angka Rp200.000).
     - Tambah link ke `/jalur-masuk`, `/biaya-kuliah`, `/jadwal-pmb`, dan portal pendaftaran.
     - Samakan kategori dengan labelnya.
  2. Untuk `/artikel/tes`, `/artikel/spesial-…`, dan `/artikel/pendaftaran-gelombang-6-…`: isi `metaTitle` ≤ 60 karakter dan `metaDescription` 140–160 karakter. Kategori diganti dari "Beasiswa" ke kategori pendaftaran atau promo.
  3. Ganti nama akun penulis menjadi nama tim yang jelas, misalnya `Panitia PMB UNJANI`.
  4. Tautkan artikel yang nyaris yatim dari artikel terkait.
  5. Slug artikel tidak diubah (D-09).

- [ ] **T.3.4** Data dan dokumen — K4, P10, M10, M15 `[MANUSIA]`
  - **butuh:** T.1.0 · **model:** — (admin CMS dan Biro Keuangan) · **effort:** - · **agent:** - · **commit:** -
  1. Input Biaya 2027/2028 untuk setiap jadwal aktif. Setelah itu kalkulator dan `/biaya-kuliah` terisi (D-04).
  2. Ekspor ulang PDF biaya dengan metadata judul yang benar (bukan `RINCIAN BIAYA TAHUN 2026.xlsx`), lalu unggah sebagai pengganti.
  3. Perbaiki FAQ "12 pilihan jalur … Kemitraan … KIP-K" agar sesuai dengan jalur yang aktif.
  4. Isi telepon kantor di Pengaturan.
  5. Unggah sertifikat akreditasi untuk semua prodi.

---

## FASE 4 — Rilis

- [ ] **T.4.0** Perbarui dokumen route
  - **file:** `docs/ARCHITECTURE.md` §3, `docs/UI-CURRENT.md` · **butuh:** T.2.7 · **model:** `claude-haiku-5-5` · **effort:** `low` · **agent:** - · **commit:** -
  1. Hapus 3 route lama. Tambah `/biaya-kuliah`, `/jalur-masuk`, `/jadwal-pmb`, dan `/faq`. Catat bahwa redirect lama kini ada di `next.config.mjs` `redirects()`.

- [ ] **T.4.1** Deploy production
  - **butuh:** T.2.7, T.4.0 · **model:** `claude-sonnet-5-5` · **effort:** `medium` (atau admin server) · **agent:** - · **commit:** -
  1. Simpan build dan folder lama untuk rollback.
  2. Build di server, lalu `pm2 restart pmb-unjani`.
  3. Smoke test: `$P/`, keempat halaman baru, dan `/admin/login` mengembalikan `200`.

- [ ] **T.4.2** Verifikasi production dan Search Console
  - **butuh:** T.4.1, T.3.0 · **model:** `claude-opus-5-5` · **effort:** `medium`, ditambah pemilik produk untuk Search Console · **agent:** - · **commit:** -
  1. Ulangi semua kriteria terima SPEC §5 dengan `P` menggantikan `B`. Tempel hasilnya ke RILIS-CHECKLIST.
  2. Jalankan Rich Results Test untuk 1 artikel, 1 pengumuman, dan `/faq`. Expected: tanpa error.
  3. Di Search Console: kirim ulang `sitemap.xml`, lalu URL Inspection → Request indexing untuk keempat URL baru. Catat daftar 404 dari laporan Pages.

- [ ] **T.4.3** Gerbang rilis dan pemantauan 30 hari `[MANUSIA]`
  - **butuh:** T.4.2, T.3.1 sampai T.3.4 · **model:** — (pemilik produk) · **effort:** - · **agent:** - · **commit:** -
  1. Pemilik menyetujui RILIS-CHECKLIST.
  2. Tanggal 5 Desember 2026: cek status *Indexed* dan impresi keempat URL baru, lalu putuskan item yang ditunda di SPEC §4.
