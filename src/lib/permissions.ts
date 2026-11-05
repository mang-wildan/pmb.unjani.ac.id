export type AdminRole = 'superadmin' | 'admin' | 'editor';

export type NavItem = {
  href?: string;
  label: string;
  icon: string;
  children?: NavItem[];
  /** If set, only these roles can see & access this item. Omit = all roles. */
  roles?: AdminRole[];
};

export const ADMIN_NAV: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: 'fa-solid fa-chart-column' },
  {
    label: 'Master Data',
    icon: 'fa-solid fa-folder-tree',
    roles: ['superadmin', 'admin'],
    children: [
      { href: '/admin/jalur-seleksi', label: 'Jalur Seleksi', icon: 'fa-solid fa-route', roles: ['superadmin', 'admin'] },
      { href: '/admin/fakultas', label: 'Fakultas', icon: 'fa-solid fa-building-columns', roles: ['superadmin', 'admin'] },
      { href: '/admin/jenjang', label: 'Jenjang', icon: 'fa-solid fa-layer-group', roles: ['superadmin', 'admin'] },
      { href: '/admin/program-studi', label: 'Program Studi', icon: 'fa-solid fa-graduation-cap', roles: ['superadmin', 'admin'] },
      { href: '/admin/kelas', label: 'Kelas', icon: 'fa-solid fa-school', roles: ['superadmin', 'admin'] },
    ],
  },
  { href: '/admin/biaya', label: 'Biaya', icon: 'Rp', roles: ['superadmin', 'admin'] },
  { href: '/admin/jadwal', label: 'Jadwal', icon: 'fa-solid fa-calendar-days', roles: ['superadmin', 'admin'] },
  { href: '/admin/dokumen', label: 'Dokumen PDF', icon: 'fa-solid fa-file-pdf' },
  { href: '/admin/pengumuman', label: 'Pengumuman', icon: 'fa-solid fa-bullhorn' },
  { href: '/admin/artikel', label: 'Artikel', icon: 'fa-solid fa-newspaper' },
  { href: '/admin/kategori-artikel', label: 'Kategori Artikel', icon: 'fa-solid fa-tags' },
  { href: '/admin/faq', label: 'FAQ', icon: 'fa-solid fa-comments' },
  { href: '/admin/popup', label: 'Popup Landing', icon: 'fa-solid fa-image' },
  { href: '/admin/halaman', label: 'Halaman', icon: 'fa-solid fa-file-lines' },
  { href: '/admin/pengaturan', label: 'Pengaturan', icon: 'fa-solid fa-gear', roles: ['superadmin', 'admin'] },
  { href: '/admin/log-aktivitas', label: 'Log Aktivitas', icon: 'fa-solid fa-clock-rotate-left', roles: ['superadmin', 'admin'] },
  { href: '/admin/pengguna', label: 'Pengguna', icon: 'fa-solid fa-users', roles: ['superadmin'] },
];

type AccessRule = { href: string; roles?: AdminRole[] };

/** Halaman admin yang tidak tampil di menu samping. Tanpa `roles` = semua peran. */
const EXTRA_PAGES: AccessRule[] = [{ href: '/admin/akun' }];

/** Route API admin yang tidak punya halaman padanan. Tanpa `roles` = semua peran. */
const EXTRA_APIS: AccessRule[] = [
  { href: '/api/admin/stats' }, // dashboard
  { href: '/api/admin/upload-image' }, // RichTextEditor & Pengaturan
  { href: '/api/admin/hero-images' }, // halaman Halaman (hero)
  { href: '/api/admin/akun' }, // Akun Saya (MFA)
];

const ROLE_ORDER: Record<AdminRole, number> = { editor: 1, admin: 2, superadmin: 3 };

function matches(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + '/');
}

/** Aturan akses untuk path halaman admin; null = path tidak dikenal. */
function pageRule(pathname: string): AccessRule | null {
  if (pathname === '/admin') return { href: '/admin' }; // dashboard, semua peran
  for (const item of ADMIN_NAV) {
    const candidates = item.children?.length ? item.children : [item];
    for (const candidate of candidates) {
      if (!candidate.href || candidate.href === '/admin') continue;
      if (matches(pathname, candidate.href)) return { href: candidate.href, roles: candidate.roles };
    }
  }
  return EXTRA_PAGES.find((rule) => matches(pathname, rule.href)) ?? null;
}

/** Aturan akses untuk path /api/admin/*; null = path tidak dikenal. */
function apiRule(pathname: string): AccessRule | null {
  const extra = EXTRA_APIS.find((rule) => matches(pathname, rule.href));
  if (extra) return extra;
  // /api/admin/xxx -> /admin/xxx
  return pathname.startsWith('/api/admin') ? pageRule(pathname.replace(/^\/api/, '')) : null;
}

function allows(rule: AccessRule | null, role: AdminRole): boolean {
  // Path tidak dikenal: fail-closed, hanya superadmin (FR-14).
  if (!rule) return role === 'superadmin';
  return !rule.roles || rule.roles.includes(role);
}

/** Peran terendah yang diizinkan oleh aturan. Mengasumsikan daftar `roles` tertutup ke atas. */
function minRole(rule: AccessRule | null): AdminRole {
  if (!rule) return 'superadmin';
  if (!rule.roles) return 'editor';
  return rule.roles.reduce((low, r) => (ROLE_ORDER[r] < ROLE_ORDER[low] ? r : low), 'superadmin');
}

/**
 * Returns true if `role` is allowed to access the given admin page pathname.
 * Dashboard (/admin) is always accessible; unknown routes are superadmin-only.
 */
export function canAccessPage(pathname: string, role: AdminRole): boolean {
  return allows(pageRule(pathname), role);
}

/**
 * Returns true if `role` is allowed to access the given /api/admin/* pathname.
 * Maps API paths back to their corresponding page paths; unknown routes are superadmin-only.
 */
export function canAccessApi(pathname: string, role: AdminRole): boolean {
  return allows(apiRule(pathname), role);
}

/**
 * Peran minimum untuk path admin (halaman atau /api/admin/*). Dipakai requireAdmin agar handler
 * menegakkan peta izin yang sama dengan proxy (pertahanan berlapis).
 */
export function minRoleForPath(pathname: string): AdminRole {
  return minRole(pathname.startsWith('/api/') ? apiRule(pathname) : pageRule(pathname));
}
