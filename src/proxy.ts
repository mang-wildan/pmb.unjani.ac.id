import createIntlMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';
import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifyAccessToken } from '@/lib/auth';
import { canAccessPage, canAccessApi } from '@/lib/permissions';
import { hasValidCsrfOrigin } from '@/lib/csrf';
import { clientIpFromHeaders } from '@/lib/http';

const intlMiddleware = createIntlMiddleware(routing);

export const config = {
  matcher: [
    '/((?!_next|_vercel|.*\\..*).*)',
    // Area admin tetap dicek walau path berisi titik (mis. /api/admin/hero-images/x.webp) (FR-14).
    '/admin/:path*',
    '/api/admin/:path*',
  ],
};

// Proxy tidak menulis ke database; kejadian keamanan ditulis sebagai satu baris JSON ke log server
// (FR-29). Hanya path (tanpa query), metode, IP, dan email dari klaim token; tanpa header/cookie.
function catatKeamanan(req: NextRequest, event: string, email?: string) {
  console.warn(
    JSON.stringify({
      level: 'warn',
      event,
      metode: req.method,
      path: req.nextUrl.pathname,
      ip: clientIpFromHeaders(req.headers),
      email: email ?? null,
    }),
  );
}

// CSP berbasis nonce khusus halaman /admin (FR-10, PLAN E8, G-3). Halaman publik tetap memakai CSP
// statis di next.config.mjs. Dengan 'strict-dynamic', skrip yang disisipkan oleh bundel ber-nonce
// (mis. reCAPTCHA di halaman login) tetap boleh jalan; daftar host diabaikan browser modern.
// style-src sengaja TANPA nonce: nonce membuat 'unsafe-inline' diabaikan, padahal admin memakai
// atribut style (React, SweetAlert, Tiptap).
function cspAdmin(nonce: string): string {
  const dev = process.env.NODE_ENV === 'development';
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "form-action 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net https://www.google.com https://www.gstatic.com https://www.recaptcha.net",
    "frame-src 'self' https://www.google.com https://www.recaptcha.net",
    "worker-src 'self' blob:",
    "media-src 'self' https:",
    "manifest-src 'self'",
  ].join('; ');
}

/** Lanjutkan request halaman admin dengan nonce baru: Next.js membaca nonce dari header CSP request. */
function lanjutDenganCsp(req: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = cspAdmin(nonce);
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set('Content-Security-Policy', csp);
  return res;
}

function csrfError(req: NextRequest, email?: string) {
  catatKeamanan(req, 'csrf_ditolak', email);
  return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Admin pages & admin API routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (pathname === '/admin/login') return lanjutDenganCsp(req);

    const token = req.cookies.get(SESSION_COOKIE)?.value;
    const session = token ? await verifyAccessToken(token) : null;

    // Not authenticated
    if (!session) {
      if (token) catatKeamanan(req, 'sesi_tidak_valid');
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const url = req.nextUrl.clone();
      url.pathname = '/admin/login';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith('/api/admin') && !hasValidCsrfOrigin(req)) {
      return csrfError(req, session.email);
    }

    // Role-based access check
    const allowed = pathname.startsWith('/api/admin')
      ? canAccessApi(pathname, session.role)
      : canAccessPage(pathname, session.role);

    if (!allowed) {
      catatKeamanan(req, 'akses_ditolak', session.email);
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      // Redirect to dashboard with a forbidden flag
      const url = req.nextUrl.clone();
      url.pathname = '/admin';
      url.searchParams.set('forbidden', '1');
      return NextResponse.redirect(url);
    }

    return pathname.startsWith('/api/') ? NextResponse.next() : lanjutDenganCsp(req);
  }

  // Other API routes: pass through
  if (pathname.startsWith('/api/')) {
    if (pathname === '/api/auth/logout' && !hasValidCsrfOrigin(req)) {
      return csrfError(req);
    }
    return NextResponse.next();
  }

  // Public routes: locale routing
  return intlMiddleware(req);
}
