// Jalankan: node scripts/check-v2.mjs <1..9|all>
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const baca = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const tasks = {
  8: async () => {
    const kalkulator = baca('src/components/public/KalkulatorForm.tsx');
    const progress = kalkulator.slice(kalkulator.indexOf('function ProgressStepper'), kalkulator.indexOf('function EmptyState'));
    assert.doesNotMatch(progress, /text-ink-soft\/[456]0/, 'teks langkah aktif maupun tertunda harus kontras AA');
    assert.match(progress, /text-center text-\[10px\] text-ink-muted font-medium/, 'counter memakai ink-muted 5.72:1 di putih');
    for (const key of ['programStudi', 'kelas', 'gelombang', 'cicilan', 'cicilanHint', 'cariProdi', 'pilihKelas', 'pilihGelombang', 'pilihPersentase', 'resetPilihan', 'kurangiUnit', 'tambahUnit']) {
      assert.ok(kalkulator.includes(`t('${key}')`), `label kalkulator ${key} dari kamus`);
      for (const locale of ['id', 'en']) assert.ok(JSON.parse(baca(`messages/${locale}.json`)).kalkulatorPage[key], `${locale}: ${key}`);
    }
    assert.doesNotMatch(kalkulator, /aria-label="(?:Reset semua pilihan|Kurangi jumlah unit|Tambah jumlah unit)"/, 'aria-label kalkulator terlokalisasi');
  },
  7: async () => {
    const login = baca('src/app/admin/login/page.tsx');

    // Hash bagian executable dari BASE 03daac0, bukan sekadar nama simbol.
    const normal = login.replace(/\r\n/g, '\n');
    const hash = (text) => createHash('sha256').update(text).digest('hex');
    const auth = normal.slice(normal.indexOf('declare global'), normal.indexOf('  return (\n    <main'));
    assert.equal(hash(auth), '68822f12db12dc2c86e0cb24e46dad9dfae4d37d69b2ba51abb36cf2876c1f71', 'state/effect/handler auth identik BASE 03daac0');
    const mfa = normal.slice(normal.indexOf("          {langkah === 'kode'"), normal.indexOf("          {langkah === 'info-pemulihan'"));
    assert.equal(hash(mfa), '95a89829a1c04805d17d9a8f7fb80ec539d4075054954bca31b00d79acd674d1', 'callback komponen MFA identik BASE');
    assert.ok(login.includes('flex-col lg:flex-row') && login.includes('lg:w-1/2'), 'split 50/50 dan stacked mobile');

    // 1. Desain visual Varian 02 Gold: split screen desktop + mobile banner stacked
    assert.match(login, /pmb unjani\.jpg/, 'foto kampus pmb unjani.jpg harus ada');
    assert.ok(login.includes('Kelola informasi PMB dari satu tempat'), 'heading panel branding kampus');
    assert.ok(login.includes('Pengumuman, artikel, jadwal, dan biaya pendidikan langsung tampil untuk calon mahasiswa.'), 'deskripsi branding');
    assert.ok(login.includes('Panel Admin'), 'badge/label Panel Admin di sudut atas panel kiri');
    assert.ok(login.includes('Multi Jalur Seleksi') && login.includes('Reguler, Prestasi, Beasiswa'), 'poin fitur 1');
    assert.ok(login.includes('Jadwal Terintegrasi') && login.includes('Pantau gelombang pendaftaran real-time'), 'poin fitur 2');
    assert.ok(login.includes('Informasi Biaya Transparan') && login.includes('Biaya per prodi & kelas tersedia lengkap'), 'poin fitur 3');
    assert.match(login, /bg-\[#D4AF37\]|bg-accent/, 'kotak ikon poin fitur latar gold #D4AF37');
    assert.ok(login.includes('Selamat datang'), 'heading form login');
    assert.ok(login.includes('Masuk dengan akun admin untuk mengelola konten PMB UNJANI.'), 'subheading form login');
    const submit = login.slice(login.indexOf('type="submit"'), login.indexOf('</form>'));
    assert.ok(submit.includes('bg-[#D4AF37]') && submit.includes('text-[#1D2114]'), 'CTA gold #D4AF37 teks #1D2114');
    assert.ok(submit.includes('rounded-lg'), 'CTA radius 8px');
    assert.match(submit, /Masuk\s*→/, 'teks tombol Masuk →');
    assert.ok(login.includes('Lupa password? Hubungi superadmin PMB.'), 'link bantuan lupa password');
    assert.ok(login.includes('Universitas Jenderal Achmad Yani'), 'copyright Unjani');
    assert.match(login, /bg-\[#F2F5F0\]|bg-bg/, 'latar form varian 02 #F2F5F0');
    assert.ok(login.includes('bg-[#06281D]'), 'panel branding hijau gelap');

    // Dilarang keras menambah fake remember me checkbox (kesepakatan user: tidak ada backend remember)
    assert.doesNotMatch(login, /Ingat saya|Remember me/i, 'fake remember me checkbox dilarang');

    // 2. Preservasi mutlak alur dan logika autentikasi (anti-regresi)
    const wajibAuth = (src) => {
      // reCAPTCHA v2 eksplisit dinamis
      assert.ok(src.includes('grecaptcha'), 'tipe & namespace window.grecaptcha');
      assert.ok(src.includes('__onGrecaptchaLoad'), 'callback onload reCAPTCHA');
      assert.ok(src.includes('rcContainerRef') && src.includes('rcWidgetId'), 'ref container & widget reCAPTCHA');
      assert.ok(src.includes('captchaKey') && src.includes('setCaptchaKey'), 'state captchaKey');
      assert.ok(src.includes('window.grecaptcha.render'), 'pemanggilan render reCAPTCHA');
      assert.ok(src.includes('window.grecaptcha.getResponse'), 'pengambilan token reCAPTCHA');
      assert.ok(src.includes('window.grecaptcha.reset'), 'reset token reCAPTCHA');
      assert.ok(src.includes('PETUNJUK_CAPTCHA'), 'pesan petunjuk captcha FR-03');

      // State dan alur multi-langkah MFA
      assert.match(src, /type Langkah\s*=\s*'kredensial'\s*\|\s*'kode'\s*\|\s*'daftar'\s*\|\s*'pemulihan'\s*\|\s*'info-pemulihan'/, 'union Langkah MFA');
      assert.ok(src.includes('<LangkahKode'), 'komponen LangkahKode');
      assert.ok(src.includes('<LangkahDaftar'), 'komponen LangkahDaftar');
      assert.ok(src.includes('<KodePemulihan'), 'komponen KodePemulihan');
      assert.ok(src.includes("langkah === 'info-pemulihan'"), 'tampilan info pemulihan');
      assert.ok(src.includes('hidden={langkah !== \'kredensial\'}'), 'form kredensial disembunyikan via hidden agar reCAPTCHA tidak hilang');

      // API submit & payload exact
      assert.ok(src.includes('/api/auth/login'), 'endpoint /api/auth/login');
      assert.ok(src.includes('recaptchaToken: recaptchaToken || undefined'), 'payload recaptchaToken');
      assert.ok(src.includes('data.captchaRequired && data.siteKey'), 'penanganan captchaRequired dari server');
      assert.ok(src.includes('/api/auth/logout'), 'pembatalan MFA via logout');

      // Safe redirect dashboard
      assert.ok(src.includes('safeNextPath(nextParam, window.location.origin)'), 'safeNextPath pencegah open redirect');

      // Aksesibilitas & autocomplete
      assert.ok(src.includes('id="login-email"') && src.includes('htmlFor="login-email"'), 'asosiasi label email');
      assert.ok(src.includes('id="login-password"') && src.includes('htmlFor="login-password"'), 'asosiasi label password');
      assert.ok(src.includes('autoComplete="email"'), 'autocomplete email');
      assert.ok(src.includes('autoComplete="current-password"'), 'autocomplete current-password');
      assert.ok(src.includes('aria-invalid'), 'aria-invalid');
      assert.ok(src.includes('aria-describedby'), 'aria-describedby');
      assert.ok(src.includes('aria-pressed={showPass}'), 'aria-pressed tombol showPass');
    };

    // 3. Wiring JSX keamanan: form binding, validasi native, widget captcha, submit.
    // Hash di atas tidak menyentuh JSX, jadi wiring diverifikasi struktural di sini.
    const antara = (src, awal, akhir, label) => {
      const i = src.indexOf(awal);
      const j = src.indexOf(akhir);
      assert.ok(i !== -1 && j > i, `${label}: penanda ${JSON.stringify(awal)}..${JSON.stringify(akhir)} ada`);
      return src.slice(i, j);
    };

    const wajibWiring = (src) => {
      // Form terikat ke handler submit (bukan form dekoratif)
      assert.match(src, /<form\s+onSubmit=\{onSubmit\}/, 'form terikat onSubmit={onSubmit}');

      // Input email: tipe native, wajib, controlled state
      const email = antara(src, 'ref={emailRef}', 'placeholder="admin@unjani.ac.id"', 'input email');
      assert.ok(email.includes('type="email"'), 'email type="email"');
      assert.match(email, /(^|\s)required(\s|$)/, 'email required');
      assert.ok(email.includes('value={email}'), 'email controlled value={email}');
      assert.ok(email.includes('onChange={(e) => setEmail(e.target.value)}'), 'email onChange setEmail');
      assert.ok(email.includes('autoComplete="email"'), 'email autoComplete');

      // Input password: tipe mengikuti toggle showPass, wajib, controlled state
      const pass = antara(src, 'id="login-password"', 'placeholder="••••••••"', 'input password');
      assert.ok(pass.includes("type={showPass ? 'text' : 'password'}"), 'password type mengikuti showPass');
      assert.match(pass, /(^|\s)required(\s|$)/, 'password required');
      assert.ok(pass.includes('value={password}'), 'password controlled value={password}');
      assert.ok(pass.includes('onChange={(e) => setPassword(e.target.value)}'), 'password onChange setPassword');
      assert.ok(pass.includes('autoComplete="current-password"'), 'password autoComplete');

      // Kontainer captcha hanya dirender saat server meminta (captchaKey) dan tetap ter-ref
      const captcha = antara(src, '{captchaKey && (', '<PesanGalat', 'blok captcha');
      assert.ok(captcha.includes('ref={rcContainerRef}'), 'captcha ref={rcContainerRef}');

      // Tombol submit menonaktifkan diri selama loading
      const tombol = antara(src, 'type="submit"', 'aria-busy={loading}', 'tombol submit');
      assert.ok(tombol.includes('disabled={loading}'), 'submit disabled={loading}');

      // Blok info pemulihan dirender pada langkahnya dan tombol melanjutkan ke dashboard.
      const infoPemulihan = antara(src, "{langkah === 'info-pemulihan' && (", 'Lanjut ke dashboard', 'blok info pemulihan');
      assert.ok(infoPemulihan.includes('type="button"'), 'info pemulihan type="button"');
      assert.ok(infoPemulihan.includes('onClick={masukDashboard}'), 'info pemulihan onClick={masukDashboard}');

      // Form kredensial tetap terpasang tapi hidden selama langkah MFA
      assert.match(src, /<div hidden=\{langkah !== 'kredensial'\}>/, 'form kredensial hidden saat MFA');
    };

    const guard = (src) => {
      wajibAuth(src);
      wajibWiring(src);
    };

    guard(login);

    // Negative tests: membuktikan guard menolak kode yang menghilangkan logika auth vital
    assert.throws(() => guard(login.replace('recaptchaToken: recaptchaToken || undefined', 'recaptchaToken: undefined')), 'harus menolak bila payload recaptchaToken diubah');
    assert.throws(() => guard(login.replace('safeNextPath(nextParam, window.location.origin)', 'nextParam || "/admin"')), 'harus menolak bila safeNextPath dihilangkan');
    assert.throws(() => guard(login.replace("hidden={langkah !== 'kredensial'}", '')), 'harus menolak bila hidden kredensial dihilangkan');

    // Negative control wiring: 6 mutasi wajib tertangkap (in-memory, tanpa ubah disk)
    const mutasiWiring = [
      ['hapus ref captcha', login.replace('<div ref={rcContainerRef} />', '<div />')],
      ['hapus onSubmit form', login.replace('onSubmit={onSubmit} ', '')],
      ['hapus required email+password', login.replace(/\r?\n\s+required\r?\n/g, '\n')],
      ['captcha tidak dirender', login.replace('{captchaKey && (', '{false && (')],
      ['hapus hidden kredensial', login.replace("hidden={langkah !== 'kredensial'}", '')],
      ['hapus disabled submit', login.replace('disabled={loading}', '')],
    ];
    assert.equal(mutasiWiring.length, 6, 'enam mutasi wiring terdaftar');
    for (const [label, termutasi] of mutasiWiring) {
      assert.notEqual(termutasi, login, `mutasi "${label}" benar-benar mengubah sumber`);
      assert.throws(() => guard(termutasi), `guard harus menolak mutasi: ${label}`);
    }

    // Negative control blok info pemulihan: type, callback, dan kondisi render wajib dijaga
    const mutasiInfoPemulihan = [
      ['hapus type="button"', login.replace(/type="button"(\r?\n\s+onClick=\{masukDashboard\})/, '$1')],
      ['hapus onClick={masukDashboard}', login.replace('onClick={masukDashboard}', '')],
      ['kondisi render dimatikan', login.replace("{langkah === 'info-pemulihan' && (", '{false && (')],
    ];
    for (const [label, termutasi] of mutasiInfoPemulihan) {
      assert.notEqual(termutasi, login, `mutasi "${label}" benar-benar mengubah sumber`);
      assert.throws(() => guard(termutasi), `guard harus menolak mutasi info pemulihan: ${label}`);
    }
  },
  6: async () => {
    const list = baca('src/app/[locale]/(public)/artikel/page.tsx');
    const detail = baca('src/app/[locale]/(public)/artikel/[slug]/page.tsx');
    // Hero band list SPEC: 480px desktop / 440px mobile, mulai y=0, marker overlay navbar.
    assert.match(list, /min-h-\[440px\]/, 'hero list mobile 440px');
    assert.match(list, /md:min-h-\[480px\]/, 'hero list desktop 480px');
    assert.ok(list.includes('data-public-hero'), 'hero list menandai overlay navbar');
    assert.ok(list.includes('pt-24'), 'ruang isi hero list minimal 96px');
    assert.doesNotMatch(list, /<Navbar/, 'navbar hanya dari layout publik');
    assert.ok(list.includes("t('breadcrumbLabel')"), 'label landmark breadcrumb list');
    assert.ok(list.includes('aria-current="page"'), 'aria-current breadcrumb/pagination');
    assert.ok(list.includes("t('eyebrow')") && list.includes("t('title')"), 'eyebrow + judul list dari kamus');
    // Kontrol pencarian nyata: q + kategori (KategoriArtikel) + tag (Artikel.tags), URL ter-encode.
    for (const field of ['name="q"', 'name="kategori"', 'name="tag"']) assert.ok(list.includes(field), field);
    assert.ok(list.includes('KategoriArtikel.find'), 'kategori dari koleksi KategoriArtikel');
    assert.match(list, /Artikel\.distinct\('tags'/, 'chip tag dari Artikel.tags');
    assert.ok(list.includes("t('allTags')"), 'chip semua tag dari kamus');
    assert.ok(list.includes('new URLSearchParams()'), 'filter URL ter-encode');
    // Jalankan helper URL asli tanpa loader TS/DB: encoding, pelestarian filter, reset halaman.
    const helper = list.match(/function hrefHalaman\(params: SearchParams, page: number\) \{([\s\S]*?)\n\}/)?.[1];
    assert.ok(helper, 'helper hrefHalaman dapat diuji');
    const href = new Function('params', 'page', helper);
    const encoded = new URL(href({ q: 'PMB & kampus', kategori: 'kuliah-di-unjani', tag: '2027/2028 + daftar' }, 2), 'http://localhost');
    assert.equal(encoded.searchParams.get('q'), 'PMB & kampus');
    assert.equal(encoded.searchParams.get('kategori'), 'kuliah-di-unjani');
    assert.equal(encoded.searchParams.get('tag'), '2027/2028 + daftar');
    assert.equal(encoded.searchParams.get('page'), '2');
    assert.equal(href({}, 1), '/artikel');
    assert.equal(new URL(href({ tag: 'a&b' }, 1), 'http://localhost').searchParams.has('page'), false);
    // Baris chip tag: satu baris geser horizontal di mobile, wrap di >=md + landmark berlabel.
    const wajibTagRow = (src) => {
      const baris = src.match(/<nav[^>]*aria-label=\{t\('tags'\)\}[^>]*>/)?.[0];
      assert.ok(baris, 'baris tag memakai landmark nav berlabel');
      assert.ok(baris.includes('overflow-x-auto'), 'chip tag bisa digeser horizontal di mobile');
      assert.ok(baris.includes('flex-nowrap'), 'chip tag tidak wrap di mobile');
      assert.ok(baris.includes('md:flex-wrap'), 'chip tag tetap wrap di desktop');
    };
    // Kartu unggulan tetap di alur normal dokumen (tidak absolute/fixed/sticky).
    const wajibAlurNormal = (src) => {
      const unggulan = src.match(/<article className="mt-10 grid[^"]*"/)?.[0];
      assert.ok(unggulan, 'kartu unggulan tetap di alur normal');
      assert.doesNotMatch(unggulan, /\b(absolute|fixed|sticky)\b/, 'kartu unggulan tidak lepas dari alur');
    };
    wajibTagRow(list);
    wajibAlurNormal(list);
    assert.throws(() => wajibTagRow(list.replace('overflow-x-auto', 'overflow-hidden')), 'chip tersembunyi tanpa geser harus ditolak');
    assert.throws(() => wajibTagRow(list.replace('flex-nowrap', 'flex-wrap')), 'dinding chip wrap mobile harus ditolak');
    assert.throws(() => wajibAlurNormal(list.replace('mt-10 grid overflow-hidden rounded-lg bg-white', 'mt-10 grid absolute')), 'unggulan lepas alur harus ditolak');
    // Kartu unggulan (field pinned) + grid 3 kolom + pagination numerik.
    assert.ok(list.includes('pinned: true'), 'artikel unggulan memakai field pinned');
    assert.ok(list.includes('$ne: unggulan._id'), 'artikel unggulan tidak diulang di grid');
    assert.ok(list.includes('lg:grid-cols-3'), 'grid artikel 3 kolom');
    assert.ok(list.includes('Array.from('), 'pagination numerik');
    assert.ok(list.includes('.skip(') && list.includes('.limit('), 'pagination query dipertahankan');
    // Detail editorial: satu kolom, tanpa hero foto/sidebar, konten tersanitasi.
    assert.doesNotMatch(detail, /data-public-hero/, 'detail editorial tanpa hero foto');
    assert.doesNotMatch(detail, /<aside/, 'detail editorial tanpa sidebar');
    assert.ok(detail.includes('max-w-[800px]'), 'lebar baca terukur ~800px');
    assert.ok(detail.includes('sanitizeRichText'), 'konten tetap disanitasi');
    assert.ok(detail.includes('prose-brand'), 'konten memakai styling prose');
    assert.ok(detail.includes('[&_blockquote]:border-l-4') && detail.includes('[&_blockquote]:border-[#D4AF37]'), 'quote callout gold');
    assert.ok(detail.includes("t('back')"), 'tautan kembali dari kamus');
    assert.ok(detail.includes("t('relatedTitle')"), 'judul artikel terkait dari kamus');
    assert.ok(detail.includes("t('readTime'"), 'estimasi waktu baca dari kamus');
    assert.ok(detail.includes('kategori &&'), 'badge kategori hanya bila tersedia');
    assert.ok(detail.includes('artikel.tags.length'), 'baris tag hanya dari data');
    assert.ok(detail.includes('.limit(3)'), 'artikel terkait maks 3');
    assert.ok(detail.includes('filterArtikelLayakTampilPublik'), 'status publik dipertahankan');
    assert.ok(detail.includes('notFound()'), 'slug tidak ada -> 404');
    assert.ok(detail.includes("'@type': 'Article'"), 'structured data Article');
    assert.ok(detail.includes('breadcrumbJsonLd'), 'structured data breadcrumb');
    assert.ok(detail.includes('judul_en || artikel.judul'), 'fallback locale judul');
    assert.ok(detail.includes("t('coverAlt')"), 'alt sampul terlokalisasi');
    // Isi contoh PNG tidak boleh di-hardcode.
    for (const contoh of ['4 menit baca', 'WIT X ADMISI', 'PMB UNJANI 2027/2028', 'Berita PMB', 'Panduan', 'Beasiswa', 'Kampus']) {
      assert.ok(!list.includes(contoh) && !detail.includes(contoh), `hardcode contoh PNG: ${contoh}`);
    }
    // Paritas + kelengkapan kamus id/en.
    const kunci = (l, ns) => Object.keys(JSON.parse(baca(`messages/${l}.json`))[ns]).sort();
    for (const ns of ['artikelPage', 'artikelDetail']) assert.deepEqual(kunci('id', ns), kunci('en', ns), `paritas key ${ns} id/en`);
    for (const locale of ['id', 'en']) {
      const messages = JSON.parse(baca(`messages/${locale}.json`));
      for (const key of ['breadcrumb', 'breadcrumbLabel', 'search', 'allTags', 'eyebrow', 'title', 'desc', 'empty', 'next', 'page']) assert.ok(messages.artikelPage[key], `artikelPage.${key} ${locale}`);
      for (const key of ['back', 'published', 'author', 'tags', 'readTime', 'relatedTitle', 'coverAlt']) assert.ok(messages.artikelDetail[key], `artikelDetail.${key} ${locale}`);
    }
    // Bukti assertion menolak state lama (mutasi in-memory, tanpa DB).
    const wajibHero = (src) => assert.match(src, /md:min-h-\[480px\]/, 'hero list 480px wajib');
    const wajibEditorial = (src) => { assert.doesNotMatch(src, /<aside/); assert.doesNotMatch(src, /data-public-hero/); };
    assert.throws(() => wajibHero(list.replace('md:min-h-[480px]', 'md:min-h-[520px]')), 'hero 520px harus ditolak');
    assert.throws(() => wajibEditorial(`${detail}<aside>sidebar</aside>`), 'sidebar harus ditolak');
    assert.throws(() => wajibEditorial(`${detail}<section data-public-hero />`), 'hero foto harus ditolak');
  },
  5: async () => {
    const list = baca('src/app/[locale]/(public)/pengumuman/page.tsx');
    const detail = baca('src/app/[locale]/(public)/pengumuman/[slug]/page.tsx');
    // Hero band list: 440px mobile / 480px desktop, menandai navbar overlay.
    assert.match(list, /min-h-\[440px\]/, 'hero list mobile 440px');
    assert.match(list, /md:min-h-\[480px\]/, 'hero list desktop 480px');
    assert.ok(list.includes('data-public-hero'), 'hero list menandai overlay navbar');
    assert.ok(list.includes('pt-24'), 'ruang isi hero list minimal 96px');
    assert.doesNotMatch(list, /<Navbar/, 'navbar hanya dari layout publik');
    // Hero band detail: 480px mobile / 520px desktop.
    assert.match(detail, /min-h-\[480px\]/, 'hero detail mobile 480px');
    assert.match(detail, /md:min-h-\[520px\]/, 'hero detail desktop 520px');
    assert.ok(detail.includes('data-public-hero'), 'hero detail menandai overlay navbar');
    assert.ok(detail.includes('pt-24'), 'ruang isi hero detail minimal 96px');
    assert.doesNotMatch(detail, /<Navbar/, 'navbar hanya dari layout publik');
    // Breadcrumb, eyebrow, judul, aria.
    assert.ok(list.includes("t('breadcrumbLabel')"), 'label landmark breadcrumb list');
    assert.ok(list.includes('aria-current="page"'), 'aria-current breadcrumb');
    assert.ok(list.includes("t('eyebrow')") && list.includes("t('title')"), 'eyebrow + judul list dari kamus');
    // Query Mongoose dipertahankan: hanya aktif, pinned diprioritaskan, ada pagination.
    assert.ok(list.includes('Pengumuman.find'), 'query Pengumuman.find');
    assert.ok(list.includes('aktif: true'), 'filter aktif dipertahankan');
    assert.ok(list.includes('pinned'), 'filter pinned dipertahankan');
    for (const s of ['countDocuments', 'totalPages', '.skip(', '.limit(']) assert.ok(list.includes(s), `pagination: ${s}`);
    // Kartu utama pinned + token gold + radius 8px.
    for (const cls of ['bg-[#063F2A]', 'bg-[#D4AF37]', 'text-[#1D2114]', 'rounded-lg']) assert.ok(list.includes(cls), cls);
    // Badge tanggal besar: hari + bulan/tahun terpisah.
    assert.ok(list.includes("format('DD')"), 'badge hari angka besar');
    assert.ok(list.includes("format('MMM YYYY')"), 'badge bulan/tahun');
    // Detail: konten tersanitasi + prose, sidebar gold, tombol hitam, daftar lainnya dari model.
    assert.ok(detail.includes('sanitizeRichText'), 'konten tetap disanitasi');
    assert.ok(detail.includes('prose-brand'), 'konten memakai styling prose');
    assert.ok(detail.includes('bg-[#D4AF37]'), 'sidebar gold');
    assert.ok(detail.includes('bg-[#10281D]'), 'tombol hitam sidebar');
    assert.ok(detail.includes("t('lainnyaTitle')"), 'judul pengumuman lainnya dari kamus');
    assert.ok(detail.includes("t('kembali')"), 'tautan kembali dari kamus');
    // Isi contoh PNG tidak boleh di-hardcode.
    for (const contoh of ['09 Nov 2026', '2027/2028', 'Rp200.000', 'Jadwal penting']) {
      assert.ok(!list.includes(contoh) && !detail.includes(contoh), `hardcode contoh PNG: ${contoh}`);
    }
    // Paritas + kelengkapan kamus id/en.
    const kunci = (l) => Object.keys(JSON.parse(baca(`messages/${l}.json`)).pengumumanPage).sort();
    assert.deepEqual(kunci('id'), kunci('en'), 'paritas key pengumumanPage id/en');
    for (const locale of ['id', 'en']) {
      const messages = JSON.parse(baca(`messages/${locale}.json`));
      for (const key of ['breadcrumb', 'breadcrumbLabel', 'detailCrumb', 'eyebrow', 'title', 'desc', 'empty', 'penting', 'bacaSelengkapnya', 'kembali', 'diterbitkan', 'paginationLabel', 'next', 'sidebarTitle', 'sidebarDesc', 'lainnyaTitle', 'lainnyaSemua']) assert.ok(messages.pengumumanPage[key], `pengumumanPage.${key} ${locale}`);
    }
  },
  4: async () => {
    const page = baca('src/app/[locale]/(public)/kontak/page.tsx');
    // Hero band SPEC: 480px desktop / 440px mobile, y=0, marker navbar.
    assert.match(page, /min-h-\[440px\]/, 'hero mobile 440px');
    assert.match(page, /md:min-h-\[480px\]/, 'hero desktop 480px');
    assert.ok(page.includes('data-public-hero'), 'hero harus menandai overlay navbar');
    assert.ok(page.includes('pt-24'), 'ruang isi atas hero minimal 96px');
    assert.doesNotMatch(page, /<Navbar/, 'navbar hanya dari layout publik');
    // Kontak v2.0.0 tanpa form.
    assert.doesNotMatch(page, /<form/i, 'halaman kontak tanpa form');
    // Data dinamis Settings + FAQ + PageContent.
    for (const key of ['s?.alamat', 's?.email', 's?.telepon', 's?.whatsapp', 's?.sosmed']) assert.ok(page.includes(key), key);
    assert.ok(page.includes('FAQ.find'), 'FAQ dari model');
    assert.ok(page.includes('PageContent'), 'foto/hero dari PageContent');
    // Nilai contoh PNG tidak boleh hardcode.
    assert.doesNotMatch(page, /admisi@unjani\.ac\.id/);
    assert.doesNotMatch(page, /\(022\) 6631564/);
    // Accordion dipakai ulang, bukan diduplikasi.
    assert.ok(page.includes("from '@/components/public/FAQAccordion'"));
    assert.ok(page.includes('tampilkanTab={false}'));
    assert.equal((page.match(/aria-expanded=/g) || []).length, 0, 'accordion tidak diduplikasi');
    // Token Varian 02 Gold.
    for (const cls of ['bg-[#063F2A]', 'bg-[#D4AF37]', 'text-[#D4AF37]', 'rounded-lg']) assert.ok(page.includes(cls), cls);
    assert.ok(page.includes('href="/faq"'), 'tautan FAQ lengkap');
    // Kamus id/en memuat copy baru.
    // Round 1 (review M1-M6): state pra-Task-4 (fallback alamat + short-link Maps) ditolak.
    assert.doesNotMatch(page, /Jl\. Terusan|maps\.app\.goo\.gl/, 'fallback alamat/Maps hardcode lama');
    assert.ok(page.includes('lg:items-start'), 'M1 kartu setinggi konten');
    assert.match(page, /<Image\s+src=\{fotoHero\}\s+alt=""/, 'M2 hero dekoratif alt kosong');
    assert.ok(page.includes("aria-label={t('breadcrumbLabel')}"), 'M3 label landmark breadcrumb');
    assert.ok(page.includes('aria-current="page"'), 'M3 aria-current');
    assert.ok(page.includes('.sort({ urutan: 1 })'), 'M5 FAQ urut urutan');
    assert.doesNotMatch(page, /kategori: 1/, 'M5 tanpa bias kategori');
    assert.ok(page.includes('from-[#06281D]') && !page.includes('from-black'), 'M6 gradient hijau');
    const kunci = (l) => Object.keys(JSON.parse(baca(`messages/${l}.json`)).kontakPage).sort();
    assert.deepEqual(kunci('id'), kunci('en'), 'paritas key kontakPage id/en');
    for (const locale of ['id', 'en']) {
      const messages = JSON.parse(baca(`messages/${locale}.json`));
      for (const key of ['breadcrumb', 'breadcrumbLabel', 'heroImageAlt', 'sekretariatTitle', 'sekretariatDesc', 'kampusLabel', 'bukaMaps', 'kanalTitle', 'kanalDesc', 'emailLabel', 'teleponLabel', 'whatsappCta', 'sosmedLabel', 'faqTitle', 'faqDesc', 'faqLink']) assert.ok(messages.kontakPage[key], `kontakPage.${key} ${locale}`);
    }
  },
  3: async () => {
    const page = baca('src/app/[locale]/(public)/page.tsx');
    const hero = baca('src/components/public/Hero.tsx');
    for (const id of ['manual-book', 'jalur-seleksi', 'jadwal', 'kalkulator', 'pengumuman', 'faq', 'cta']) assert.ok(page.includes(`id="${id}"`), id);
    assert.ok(hero.includes('data-public-hero'), 'Hero harus menandai overlay navbar');
    for (const css of ['min-h-[1100px]', 'md:min-h-[900px]', 'pt-24', 'bg-accent', 'text-white']) assert.ok(hero.includes(css), css);
    assert.doesNotMatch(hero, /2026\/2027/);
    assert.doesNotMatch(page, /href="\/(jalur-masuk|biaya-kuliah)"|<Navbar/);
    for (const feature of ['InstagramFeed', 'LandingPopup', 'kalkulatorRecords', 'activeJadwal', 'jumlahFakultas', 'jumlahProgramStudi']) assert.ok(page.includes(feature));
    assert.ok(page.includes('bg-[#063F2A]'));
    assert.ok(page.includes('bg-[#D4AF37]'));
    const jalur = baca('src/components/public/JalurAccordion.tsx');
    for (const feature of ['aside', 'persyaratan', 'aria-pressed', 'urlPendaftaran', 'dangerouslySetInnerHTML']) assert.ok(jalur.includes(feature), feature);
    const kalkulator = baca('src/components/public/KalkulatorForm.tsx');
    assert.ok(kalkulator.includes('records.length === 0'));
    const faq = baca('src/components/public/FAQAccordion.tsx');
    assert.ok(faq.includes('aria-pressed'));
    assert.ok(baca('src/components/public/ProgramStudiExplorer.tsx').includes('lg:grid-cols-4'));
    assert.ok(baca('src/components/public/ArtikelSection.tsx').includes('id="artikel"'));
    const slider = baca('src/components/public/HeroSlider.tsx');
    assert.ok(slider.includes("fullBleed ? 'h-full w-full'"));
    assert.ok(slider.includes("fullBleed ? '100vw'"));
    // Round 1 fixes (review I1/I2/M1/M2/M4)
    assert.ok(kalkulator.includes('useTranslations'), 'kalkulator: i18n klien');
    assert.ok(kalkulator.includes("t('hasilPerJalur')"), 'kalkulator: hasil header dari kamus');
    assert.ok(kalkulator.includes("t('estimasiBiaya')"), 'kalkulator: eyebrow dari kamus');
    // Round 2: assertion spesifik, bukan includes global yang vakum.
    const wajibJudulHasil = (src) =>
      assert.match(src, /className="[^"]*(?<![\w/-])text-white(?![\w/-])[^"]*">\s*\{t\('hasilPerJalur'\)\}/, 'kalkulator: judul hasil harus text-white pada band gelap');
    const wajibDisclaimer = (src) => {
      assert.doesNotMatch(src, /text-ink-muted[^"]*text-center">\s*\* Estimasi/, 'kalkulator: disclaimer tidak boleh text-ink-muted di band gelap');
      assert.match(src, /text-white\/80[^"]*text-center">\s*\* Estimasi/, 'kalkulator: disclaimer harus text-white/80');
    };
    const wajibKeyGelombang = (src) => assert.ok(src.includes('key={g._id}'), 'gelombang: key harus key={g._id}');
    wajibJudulHasil(kalkulator);
    wajibDisclaimer(kalkulator);
    const gelombangSrc = baca('src/components/public/HeroGelombangInfo.tsx');
    wajibKeyGelombang(gelombangSrc);
    // Bukti assertion menolak state lama (mutasi in-memory, tanpa DB).
    assert.throws(() => wajibJudulHasil(kalkulator.replace('text-white leading-tight', 'text-ink leading-tight')), 'judul lama harus ditolak');
    assert.throws(() => wajibDisclaimer(kalkulator.replace('text-white/80 text-center', 'text-ink-muted text-center')), 'disclaimer lama harus ditolak');
    assert.throws(() => wajibKeyGelombang(gelombangSrc.replace('key={g._id}', 'key={g.ke}')), 'key lama harus ditolak');
    const pse = baca('src/components/public/ProgramStudiExplorer.tsx');
    assert.ok(pse.includes('max-md:data-[tingkat=prodi]:hidden'), 'prodi: rail tersembunyi saat drill-down mobile');
    assert.ok(jalur.includes('scrollIntoView'), 'jalur: gulir panel persyaratan saat pilih');
    assert.ok(jalur.includes('prefers-reduced-motion'), 'jalur: hormati reduced motion');
    for (const locale of ['id', 'en']) {
      const messages = JSON.parse(baca(`messages/${locale}.json`));
      assert.ok(messages.jalurPage.daftarJalur);
      assert.ok(messages.prodiExplorer.ringkasan.includes('{fakultas}'));
      for (const key of ['pendaftaranAktif', 'pendaftaranSelesai', 'gelombangKosong']) assert.ok(messages.hero[key]);
      for (const key of ['kriteriaJudul', 'kriteriaSub', 'estimasiBiaya', 'hasilPerJalur', 'jalurCount', 'langkah', 'semuaSelesai']) assert.ok(messages.kalkulatorPage[key], `kalkulatorPage.${key}`);
      if (locale === 'en') assert.match(messages.kalkulatorPage.jalurCount, /\{n, plural,/, 'kalkulator EN: jalurCount harus ICU plural');
    }
  },
  2: async () => {
    const layout = baca('src/app/layout.tsx');
    assert.match(layout, /const display = Montserrat\(/, 'Font display harus Montserrat asli');
    assert.doesNotMatch(layout, /Plus_Jakarta_Sans/);
    assert.match(layout, /const sans = Inter\(/);
    assert.match(layout, /weight: \['500', '600', '700', '800'\]/);
    assert.match(layout, /variable: '--font-display'/);
    const theme = baca('tailwind.config.ts');
    const colorMatch = (palette, key) => {
      const block = theme.split(`${palette}: {`)[1]?.split('}')[0] ?? '';
      const m = block.match(new RegExp(`^\\s*${key}:\\s*'([^']+)'`, 'm'));
      return m ? m[1] : null;
    };
    assert.equal(colorMatch('brand', 'DEFAULT'), '#063F2A', 'brand.DEFAULT harus #063F2A');
    assert.equal(colorMatch('brand', '900'), '#06281D', 'brand.900 harus #06281D');
    assert.equal(colorMatch('accent', 'DEFAULT'), '#D4AF37', 'accent.DEFAULT harus #D4AF37');
    assert.equal(colorMatch('accent', '600'), '#C4A030', 'accent.600 harus #C4A030');
    assert.equal(colorMatch('ink', 'DEFAULT'), '#10281D', 'ink.DEFAULT harus #10281D');
    assert.equal(colorMatch('ink', 'muted'), '#576B5F', 'ink.muted harus #576B5F');
    assert.ok(theme.includes("surface: '#ffffff'"));
    for (const [palette, shades] of [['brand', [50, 100, 200, 300, 400, 600, 700, 800, 900]], ['accent', [50, 100, 200, 300, 600, 700]]]) {
      const block = theme.split(`${palette}: {`)[1].split('}')[0];
      for (const shade of shades) assert.ok(block.includes(`${shade}:`), `${palette}.${shade}`);
    }
    assert.ok(theme.includes("soft: '#8a9499'"));
    const langSwitcher = baca('src/components/public/LanguageSwitcher.tsx');
    assert.ok(langSwitcher.includes('rounded-lg'), 'LanguageSwitcher harus rounded-lg');
    assert.doesNotMatch(langSwitcher, /rounded-full/, 'LanguageSwitcher tidak boleh rounded-full');
    for (const locale of ['id', 'en']) {
      const messages = JSON.parse(baca(`messages/${locale}.json`));
      for (const key of ['navigasiUtama', 'berandaLabel', 'penerimaanMahasiswaBaru']) assert.ok(messages.nav[key]);
    }
    assert.match(theme, /'2xl': '1.25rem'/);
    assert.match(theme, /'3xl': '1.75rem'/);
    const navbar = baca('src/components/public/Navbar.tsx');
    const footer = baca('src/components/public/Footer.tsx');
    for (const source of [navbar, footer]) {
      for (const anchor of ['/#jalur-seleksi', '/#kalkulator']) assert.ok(source.includes(anchor), anchor);
      assert.doesNotMatch(source, /\/jalur-masuk|\/biaya-kuliah/);
      assert.ok(source.includes('rounded-lg'));
    }
    for (const contract of ['fixed inset-x-0 top-0', 'scrolled', "passive: true", 'motion-reduce:transition-none', 'inert={!open}', 'aria-expanded={open}', 'aria-controls=', 'focus-visible:ring', "'Escape'", 'usePathname', 'useLocale', 'data-public-hero', 'bg-[#D4AF37]', 'text-[#1D2114]']) assert.ok(navbar.includes(contract), contract);
    assert.match(navbar, /<a href=\{anchorHref\(l.href\)\}/);
    assert.ok(footer.includes('bg-[#06281D]'));
    assert.ok(footer.includes('text-[#D4AF37]'));
    assert.ok(footer.includes('settings?.email'));
    assert.ok(footer.includes('settings?.sosmed'));
    const publicLayout = baca('src/app/[locale]/(public)/layout.tsx');
    assert.equal((publicLayout.match(/<Navbar /g) || []).length, 1);
  },
  1: async () => {
    const cfg = (await import('../next.config.mjs')).default;
    const rules = await cfg.redirects();
    const groups = [
      [['/jalur-masuk', '/id/jalur-masuk', '/jalur-seleksi', '/id/jalur-seleksi', '/semuajalur', '/jalur-lanjutan', '/jalur-pmdk-3', '/jalur-magister'], '/#jalur-seleksi'],
      [['/en/jalur-masuk', '/en/jalur-seleksi'], '/en#jalur-seleksi'],
      [['/biaya-kuliah', '/id/biaya-kuliah', '/biaya-pendidikan', '/id/biaya-pendidikan', '/infomasi-biaya'], '/#kalkulator'],
      [['/en/biaya-kuliah', '/en/biaya-pendidikan'], '/en#kalkulator'],
      [['/jadwal'], '/jadwal-pmb'],
      [['/en/jadwal'], '/en/jadwal-pmb'],
      [['/prodi'], '/'],
      [['/jalur-ods'], '/pengumuman/mekanisme-ods'],
      [['/jadwal-pmb-september'], '/jadwal-pmb'],
    ];
    for (const [sources, destination] of groups) {
      for (const source of sources) {
        assert.deepEqual(rules.filter((rule) => rule.source === source),
          [{ source, destination, permanent: true }], source);
      }
    }
    const sources = new Set(rules.map((rule) => rule.source));
    for (const rule of rules) {
      assert.equal(sources.has(rule.destination.split('#')[0]), false, `Redirect berantai: ${rule.source}`);
    }
    const sitemap = baca('src/app/sitemap.ts');
    for (const route of ['jalur-masuk', 'biaya-kuliah']) {
      assert.equal(sitemap.includes(`/${route}`), false, `Sitemap: ${route}`);
      assert.equal(existsSync(new URL(`../src/app/[locale]/(public)/${route}/page.tsx`, import.meta.url)), false, `Halaman: ${route}`);
    }
  },
};

const pilih = process.argv[2] ?? 'all';
assert.ok(pilih === 'all' || Object.hasOwn(tasks, pilih), `Task tidak tersedia: ${pilih}`);
for (const [n, fn] of Object.entries(tasks)) {
  if (pilih === 'all' || pilih === n) {
    await fn();
    console.log(`Task ${n} OK`);
  }
}
