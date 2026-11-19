// Jalankan: node scripts/check-v2.mjs <1..9|all>
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const baca = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const tasks = {
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
