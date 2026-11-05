import dayjs from 'dayjs';
import 'dayjs/locale/id';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import JsonLd from '@/components/public/JsonLd';
import { Link } from '@/i18n/navigation';
import { connectDb } from '@/lib/db';
import { sanitizeRichText, stripHtml } from '@/lib/sanitize';
import {
  breadcrumbJsonLd,
  buildMetadata,
  LOGO_URL,
  SITE_NAME,
  SITE_URL,
  type PublicLocale,
} from '@/lib/seo';
import { Artikel, filterArtikelLayakTampilPublik } from '@/models/Artikel';
import '@/models/AdminUser';
import '@/models/KategoriArtikel';

export const dynamic = 'force-dynamic';

type ArtikelDetail = {
  slug: string;
  judul: string;
  judul_en?: string;
  isi: string;
  isi_en?: string;
  coverImage: string;
  publishedAt: Date;
  updatedAt: Date;
  tags: string[];
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  createdBy?: { nama?: string } | null;
  kategori_id?: { nama?: string; nama_en?: string; slug?: string } | null;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: PublicLocale; slug: string }>;
}) {
  const { locale, slug } = await params;
  await connectDb();
  const artikel = await Artikel.findOne({
    slug,
    ...filterArtikelLayakTampilPublik(),
  })
    .select('slug judul judul_en isi isi_en coverImage metaTitle metaDescription ogImage')
    .lean();
  if (!artikel) {
    const t = await getTranslations({ locale, namespace: 'artikelPage' });
    return buildMetadata({
      title: t('metaTitle'),
      path: `/artikel/${slug}`,
      locale,
      noIndex: true,
    });
  }
  const judul = locale === 'en' ? artikel.judul_en || artikel.judul : artikel.judul;
  const isi = locale === 'en' ? artikel.isi_en || artikel.isi : artikel.isi;
  return buildMetadata({
    title: artikel.metaTitle || judul,
    description: artikel.metaDescription || stripHtml(isi, 200),
    image: artikel.ogImage || artikel.coverImage,
    path: `/artikel/${artikel.slug}`,
    locale,
    hanyaId: !artikel.judul_en?.trim(),
  });
}

export default async function ArtikelDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const publicLocale: PublicLocale = locale === 'en' ? 'en' : 'id';
  const [t, tPage] = await Promise.all([
    getTranslations('artikelDetail'),
    getTranslations('artikelPage'),
  ]);
  await connectDb();
  const hasil = await Artikel.findOne({
    slug,
    ...filterArtikelLayakTampilPublik(),
  })
    .select('slug judul judul_en isi isi_en coverImage publishedAt updatedAt tags metaTitle metaDescription ogImage createdBy kategori_id')
    .populate('createdBy', 'nama -_id')
    .populate('kategori_id', 'nama nama_en slug -_id')
    .lean();
  if (!hasil) notFound();

  const artikel = hasil as unknown as ArtikelDetail;
  const judul = publicLocale === 'en' ? artikel.judul_en || artikel.judul : artikel.judul;
  const isi = publicLocale === 'en' ? artikel.isi_en || artikel.isi : artikel.isi;
  const kategori = publicLocale === 'en'
    ? artikel.kategori_id?.nama_en || artikel.kategori_id?.nama
    : artikel.kategori_id?.nama;
  const published = new Date(artikel.publishedAt).toISOString();
  const modified = new Date(
    Math.max(+new Date(artikel.publishedAt), +new Date(artikel.updatedAt)),
  ).toISOString();
  const localePrefix = publicLocale === 'en' ? '/en' : '';
  const pathArtikel = `${localePrefix}/artikel/${artikel.slug}`;
  const image = artikel.ogImage || artikel.coverImage;
  const absoluteImage = image.startsWith('http') ? image : `${SITE_URL}${image.startsWith('/') ? '' : '/'}${image}`;

  return (
    <article className="container mx-auto max-w-4xl py-12 md:py-16">
      <nav aria-label="Breadcrumb" className="text-sm text-ink-muted">
        <Link href="/" className="hover:text-brand-700">{publicLocale === 'en' ? 'Home' : 'Beranda'}</Link>
        <span className="mx-2">/</span>
        <Link href="/artikel" className="hover:text-brand-700">{tPage('title')}</Link>
        <span className="mx-2">/</span>
        <span className="text-ink">{judul}</span>
      </nav>

      <header className="mt-6">
        <h1 className="font-display text-3xl font-extrabold leading-tight text-ink md:text-5xl">{judul}</h1>
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-muted">
          <span><strong className="text-ink">{t('author')}:</strong> {artikel.createdBy?.nama || 'PMB UNJANI'}</span>
          <time dateTime={published}><strong className="text-ink">{t('published')}:</strong> {dayjs(artikel.publishedAt).locale(publicLocale).format('DD MMMM YYYY')}</time>
          {kategori && artikel.kategori_id?.slug && (
            <Link href={`/artikel?kategori=${artikel.kategori_id.slug}`} className="hover:text-brand-700"><strong className="text-ink">{t('category')}:</strong> {kategori}</Link>
          )}
        </div>
      </header>

      <div className="relative mt-8 aspect-video overflow-hidden rounded-3xl bg-brand-50">
        <Image src={artikel.coverImage} alt={`${publicLocale === 'en' ? 'Article cover' : 'Sampul artikel'} ${judul}`} fill sizes="(min-width: 1024px) 896px, 100vw" className="object-cover" priority />
      </div>

      <div className="prose-brand mt-10 text-ink" dangerouslySetInnerHTML={{ __html: sanitizeRichText(isi) }} />

      {artikel.tags.length > 0 && (
        <div className="mt-8 flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-ink-muted">{t('tags')}:</span>
          {artikel.tags.map((tag) => (
            <Link key={tag} href={`/artikel?tag=${encodeURIComponent(tag)}`} className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100">#{tag}</Link>
          ))}
        </div>
      )}

      <div className="mt-10"><Link href="/artikel" className="text-sm font-semibold text-brand-700 hover:text-brand-600">{t('back')}</Link></div>

      <JsonLd data={[
        breadcrumbJsonLd([
          { name: publicLocale === 'en' ? 'Home' : 'Beranda', path: localePrefix || '/' },
          { name: tPage('title'), path: `${localePrefix}/artikel` },
          { name: judul, path: pathArtikel },
        ]),
        {
          '@context': 'https://schema.org', '@type': 'Article', headline: judul,
          description: artikel.metaDescription || stripHtml(isi, 200), image: absoluteImage,
          datePublished: published, dateModified: modified,
          author: { '@type': 'Organization', name: artikel.createdBy?.nama || SITE_NAME },
          mainEntityOfPage: `${SITE_URL}${pathArtikel}`,
          publisher: { '@type': 'Organization', name: SITE_NAME, logo: { '@type': 'ImageObject', url: LOGO_URL } },
        },
      ]} />
    </article>
  );
}
