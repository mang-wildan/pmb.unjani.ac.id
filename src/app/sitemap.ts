import type { MetadataRoute } from 'next';
import { connectDb } from '@/lib/db';
import { Pengumuman } from '@/models/Pengumuman';
import { Artikel, filterArtikelLayakTampilPublik } from '@/models/Artikel';
import { SITE_URL } from '@/lib/seo';

export const revalidate = 60;

function localizedEntries(
  path: string,
  data: Omit<MetadataRoute.Sitemap[number], 'url'>,
  adaEn = true,
): MetadataRoute.Sitemap {
  const idPath = path === '/' ? '/' : path;
  const enPath = path === '/' ? '/en' : `/en${path}`;
  const id = { url: `${SITE_URL}${idPath}`, ...data };
  return adaEn ? [id, { url: `${SITE_URL}${enPath}`, ...data }] : [id];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    ...localizedEntries('/', { changeFrequency: 'daily', priority: 1.0 }),
    ...localizedEntries('/jadwal-pmb', { changeFrequency: 'weekly', priority: 0.8 }),
    ...localizedEntries('/faq', { changeFrequency: 'monthly', priority: 0.7 }),
    ...localizedEntries('/pengumuman', { changeFrequency: 'daily', priority: 0.8 }),
    ...localizedEntries('/artikel', { changeFrequency: 'daily', priority: 0.8 }),
    ...localizedEntries('/kontak', { changeFrequency: 'monthly', priority: 0.6 }),
  ];

  try {
    await connectDb();
    const [pengumuman, artikel] = await Promise.all([
      Pengumuman.find({ aktif: true })
        .select('slug judul_en updatedAt')
        .sort({ updatedAt: -1 })
        .limit(200)
        .lean(),
      Artikel.find(filterArtikelLayakTampilPublik())
        .select('slug judul_en updatedAt')
        .sort({ updatedAt: -1 })
        .limit(200)
        .lean(),
    ]);
    const pengumumanEntries: MetadataRoute.Sitemap = pengumuman.flatMap((p) =>
      localizedEntries(`/pengumuman/${p.slug}`, {
        lastModified: p.updatedAt as Date | undefined,
        changeFrequency: 'weekly',
        priority: 0.7,
      }, Boolean((p as any).judul_en?.trim())),
    );
    const artikelEntries: MetadataRoute.Sitemap = artikel.flatMap((item) =>
      localizedEntries(`/artikel/${item.slug}`, {
        lastModified: item.updatedAt as Date | undefined,
        changeFrequency: 'weekly',
        priority: 0.7,
      }, Boolean((item as any).judul_en?.trim())),
    );
    return [...staticRoutes, ...pengumumanEntries, ...artikelEntries];
  } catch {
    return staticRoutes;
  }
}
