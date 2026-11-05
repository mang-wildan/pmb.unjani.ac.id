import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    // /api/files/ menyajikan PDF biaya dan buku panduan publik; harus bisa dirayapi.
    rules: [{ userAgent: '*', allow: ['/', '/api/files/'], disallow: ['/admin', '/api'] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
