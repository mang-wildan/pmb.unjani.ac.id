// Jalankan: node scripts/check-v2.mjs <1..9|all>
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const baca = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const tasks = {
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
    for (const locale of ['id', 'en']) {
      const messages = JSON.parse(baca(`messages/${locale}.json`));
      assert.ok(messages.jalurPage.daftarJalur);
      assert.ok(messages.prodiExplorer.ringkasan.includes('{fakultas}'));
      for (const key of ['pendaftaranAktif', 'pendaftaranSelesai', 'gelombangKosong']) assert.ok(messages.hero[key]);
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
