const BACKSLASH = String.fromCharCode(92);
const FALLBACK = '/admin';

/**
 * Tujuan redirect setelah login (FR-15): hanya path internal di bawah /admin pada origin yang sama.
 * Apa pun selain itu (URL absolut, //host, backslash, path di luar /admin, halaman login sendiri)
 * diganti /admin. Aman dipakai di klien maupun server.
 */
export function safeNextPath(raw: string | null | undefined, origin: string): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.includes(BACKSLASH)) {
    return FALLBACK;
  }
  let url: URL;
  try {
    url = new URL(raw, origin);
  } catch {
    return FALLBACK;
  }
  if (url.origin !== new URL(origin).origin) return FALLBACK;
  const path = url.pathname;
  if (path !== '/admin' && !path.startsWith('/admin/')) return FALLBACK;
  if (path === '/admin/login' || path.startsWith('/admin/login/')) return FALLBACK;
  return path + url.search + url.hash;
}
