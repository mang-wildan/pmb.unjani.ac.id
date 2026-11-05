// Verifikasi matriks role x route admin (FR-14). Tanpa DB, tanpa jaringan.
// Jalankan: npx tsx scripts/verify-access-matrix.ts   (keluar non-nol bila ada penyimpangan)
import { readdirSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';
import { canAccessApi, canAccessPage, minRoleForPath, type AdminRole } from '../src/lib/permissions';

const roles: AdminRole[] = ['editor', 'admin', 'superadmin'];
const ORDER: Record<AdminRole, number> = { editor: 1, admin: 2, superadmin: 3 };

// Baseline T-02 (RILIS-CHECKLIST §1.2): peran minimum per segmen pertama setelah /admin atau /api/admin.
const MIN_BY_SEGMENT: Record<string, AdminRole> = {
  '': 'editor', // dashboard
  artikel: 'editor',
  'kategori-artikel': 'editor',
  dokumen: 'editor',
  faq: 'editor',
  halaman: 'editor',
  pengumuman: 'editor',
  popup: 'editor',
  stats: 'editor',
  'upload-image': 'editor',
  'hero-images': 'editor',
  akun: 'editor',
  biaya: 'admin',
  fakultas: 'admin',
  jenjang: 'admin',
  kelas: 'admin',
  jadwal: 'admin',
  'jalur-seleksi': 'admin',
  'program-studi': 'admin',
  pengaturan: 'admin',
  'log-aktivitas': 'admin',
  pengguna: 'superadmin',
};

function walk(dir: string, file: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, file, out);
    else if (name === file) out.push(p.split(sep).join('/'));
  }
  return out;
}

const pages = walk('src/app/admin', 'page.tsx')
  .map((p) => p.replace('src/app', '').replace('/page.tsx', ''))
  .filter((r) => r !== '/admin/login');
const apis = walk('src/app/api/admin', 'route.ts').map((p) =>
  p.replace('src/app', '').replace('/route.ts', ''),
);
const concrete = (r: string) =>
  r.split('[id]').join('6650a1b2c3d4e5f6a7b8c9d0').split('[filename]').join('hero-1.webp');

function segment(path: string): string {
  return path.replace(/^\/api/, '').replace(/^\/admin\/?/, '').split('/')[0] ?? '';
}

let gagal = 0;
const rows: string[] = [];
function cek(path: string, isApi: boolean) {
  const p = concrete(path);
  const seg = segment(p);
  const expected = MIN_BY_SEGMENT[seg];
  if (!expected) {
    gagal++;
    console.log(`FAIL segmen tanpa baseline: ${p}`);
    return;
  }
  const marks = roles.map((r) => {
    const can = isApi ? canAccessApi(p, r) : canAccessPage(p, r);
    if (can !== ORDER[r] >= ORDER[expected]) {
      gagal++;
      console.log(`FAIL ${isApi ? 'API' : 'halaman'} ${p} peran ${r}: dapat=${can}, seharusnya=${ORDER[r] >= ORDER[expected]}`);
    }
    return can ? 'Y' : '-';
  });
  if (minRoleForPath(p) !== expected) {
    gagal++;
    console.log(`FAIL minRoleForPath ${p}: ${minRoleForPath(p)} != ${expected}`);
  }
  rows.push(`| ${path} (${isApi ? 'API' : 'halaman'}) | ${marks.join(' | ')} |`);
}

for (const p of pages) cek(p, false);
for (const a of apis) cek(a, true);

// Fail-closed: path tidak dikenal hanya untuk superadmin.
const tidakDikenal = ['/api/admin/rute-fiktif', '/admin/halaman-fiktif', '/admin/%62iaya', '/api/admin/biaya-x'];
for (const p of tidakDikenal) {
  const isApi = p.startsWith('/api/');
  const marks = roles.map((r) => {
    const can = isApi ? canAccessApi(p, r) : canAccessPage(p, r);
    if (can !== (r === 'superadmin')) {
      gagal++;
      console.log(`FAIL tak dikenal ${p} peran ${r}: dapat=${can}`);
    }
    return can ? 'Y' : '-';
  });
  rows.push(`| ${p} (tak dikenal) | ${marks.join(' | ')} |`);
}

console.log('| Route | editor | admin | superadmin |');
console.log('|---|---|---|---|');
for (const r of rows) console.log(r);
console.log(`\n${pages.length} halaman + ${apis.length} API + ${tidakDikenal.length} tak dikenal, ${roles.length} peran`);
console.log(gagal === 0 ? 'SEMUA SESUAI BASELINE' : `${gagal} PENYIMPANGAN`);
process.exit(gagal === 0 ? 0 : 1);
