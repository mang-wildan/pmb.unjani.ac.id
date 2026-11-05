import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { connectDb } from '@/lib/db';
import { Pengumuman } from '@/models/Pengumuman';
import { sanitizeRichText, stripHtml } from '@/lib/sanitize';
import {
  buildMetadata,
  breadcrumbJsonLd,
  SITE_URL,
  SITE_NAME,
  LOGO_URL,
  type PublicLocale,
} from '@/lib/seo';
import JsonLd from '@/components/public/JsonLd';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: PublicLocale; slug: string }>;
}) {
  const { locale, slug } = await params;

  await connectDb().catch(() => null);
  const p = await Pengumuman.findOne({ slug, aktif: true }).lean();
  if (!p) {
    return buildMetadata({
      title: 'Pengumuman',
      path: `/pengumuman/${slug}`,
      locale,
      noIndex: true,
    });
  }
  const judul =
    locale === 'en' ? ((p as any).judul_en || p.judul) : p.judul;
  const ringkasan =
    locale === 'en' ? ((p as any).ringkasan_en || p.ringkasan) : p.ringkasan;
  return buildMetadata({
    title: p.metaTitle || judul,
    description: p.metaDescription || ringkasan || stripHtml(p.konten || '', 200),
    path: `/pengumuman/${p.slug}`,
    locale,
    hanyaId: !(p as any).judul_en?.trim(),
  });
}

export default async function PengumumanDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const t = await getTranslations('pengumumanPage');

  await connectDb().catch(() => null);
  const p = await Pengumuman.findOne({ slug, aktif: true }).lean();
  if (!p) notFound();

  const judul = locale === 'en' ? ((p as any).judul_en || p.judul) : p.judul;
  const ringkasan = locale === 'en' ? ((p as any).ringkasan_en || p.ringkasan) : p.ringkasan;
  const konten = locale === 'en' ? ((p as any).konten_en || p.konten) : p.konten;
  const published = new Date(p.publishedAt as Date).toISOString();

  return (
    <article className="container mx-auto py-12 md:py-16 max-w-3xl">
      <nav aria-label="Breadcrumb" className="text-sm text-ink-muted">
        <Link href="/" className="hover:text-brand-700">
          Beranda
        </Link>
        <span className="mx-2">/</span>
        <Link href="/pengumuman" className="hover:text-brand-700">
          {t('title')}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-ink">{judul}</span>
      </nav>

      <header className="mt-6">
        <time className="text-sm text-ink-muted" dateTime={published}>
          {t('diterbitkan')}{' '}
          {dayjs(p.publishedAt as Date)
            .locale(locale === 'en' ? 'en' : 'id')
            .format('DD MMMM YYYY')}
        </time>
        <h1 className="mt-2 font-display text-3xl md:text-4xl font-extrabold text-ink leading-tight">
          {judul}
        </h1>
        {ringkasan && <p className="mt-4 text-lg text-ink-muted">{ringkasan}</p>}
      </header>

      <div
        className="prose-brand mt-8 text-ink"
        dangerouslySetInnerHTML={{ __html: sanitizeRichText(konten || '') }}
      />

      <div className="mt-10">
        <Link href="/pengumuman" className="text-sm font-semibold text-brand-700 hover:text-brand-600">
          {t('kembali')}
        </Link>
      </div>

      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Beranda', path: '/' },
            { name: 'Pengumuman', path: '/pengumuman' },
            { name: judul, path: `/pengumuman/${p.slug}` },
          ]),
          {
            '@context': 'https://schema.org',
            '@type': 'NewsArticle',
            headline: judul,
            datePublished: published,
            dateModified: new Date(
              Math.max(+new Date(p.publishedAt as Date), +new Date((p as any).updatedAt)),
            ).toISOString(),
            description: p.metaDescription || ringkasan || stripHtml(konten || '', 200),
            mainEntityOfPage: `${SITE_URL}/pengumuman/${p.slug}`,
            author: { '@type': 'Organization', name: SITE_NAME },
            publisher: {
              '@type': 'Organization',
              name: SITE_NAME,
              logo: { '@type': 'ImageObject', url: LOGO_URL },
            },
          },
        ]}
      />
    </article>
  );
}
