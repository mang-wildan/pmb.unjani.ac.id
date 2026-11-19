// Jalankan: node scripts/check-v2.mjs <1..9|all>
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const baca = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const tasks = {
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
