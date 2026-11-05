import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const isDev = process.env.NODE_ENV === 'development';

/** @type {import('next').NextConfig} */
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self' https://pendaftaran.unjani.ac.id",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://www.googletagmanager.com https://www.google-analytics.com https://www.google.com https://www.gstatic.com https://www.recaptcha.net`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net https://graph.instagram.com https://www.google.com https://www.gstatic.com https://www.recaptcha.net",
  "frame-src 'self' https://www.google.com https://www.recaptcha.net",
  "worker-src 'self' blob:",
  "media-src 'self' https:",
  "manifest-src 'self'",
].join('; ');

const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
];

const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB || 15);

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Request yang melewati proxy ditampung Next.js di memori hanya sampai batas ini; sisanya
    // DIPOTONG (bawaan 10 MB). Harus >= batas upload terbesar (MAX_UPLOAD_MB) + overhead multipart.
    // Body yang lebih besar sudah ditolak 413 oleh tolakBodyBesar (src/lib/http.ts).
    proxyClientMaxBodySize: `${MAX_UPLOAD_MB + 1}mb`,
  },
  poweredByHeader: false,
  compress: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'pendaftaran.unjani.ac.id' },
      { protocol: 'https', hostname: 'www.unjani.ac.id' },
      { protocol: 'https', hostname: '**.cdninstagram.com' },
      { protocol: 'https', hostname: '**.fbcdn.net' },
    ],
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // Halaman /admin memakai CSP nonce dari src/proxy.ts (PLAN E8); dua kebijakan tidak boleh bertumpuk.
      {
        source: '/:path((?!admin$|admin/).*)',
        headers: [{ key: 'Content-Security-Policy', value: contentSecurityPolicy }],
      },
    ];
  },
  serverExternalPackages: ['mongoose', 'bcryptjs', 'formidable', 'file-type'],
};

export default withNextIntl(nextConfig);
