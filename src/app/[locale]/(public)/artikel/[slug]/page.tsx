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
  _id: unknown;
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
  kategori_id?: { _id?: unknown; nama?: string; nama_en?: string; slug?: string } | null;
};

type ArtikelTerkait = {
  _id: unknown;
  slug: string;
  judul: string;
  judul_en?: string;
  coverImage: string;
  isi: string;
  isi_en?: string;
  createdBy?: { nama?: string } | null;
  publishedAt: Date;
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
  const dayjsLocale = publicLocale;
  const [t, tPage, tc] = await Promise.all([
    getTranslations('artikelDetail'),
    getTranslations('artikelPage'),
    getTranslations('common'),
  ]);
  await connectDb();
  const hasil = await Artikel.findOne({
    slug,
    ...filterArtikelLayakTampilPublik(),
  })
    .select('slug judul judul_en isi isi_en coverImage publishedAt updatedAt tags metaTitle metaDescription ogImage createdBy kategori_id')
    .populate('createdBy', 'nama -_id')
    .populate('kategori_id', 'nama nama_en slug')
    .lean();
  if (!hasil) notFound();

  const artikel = hasil as unknown as ArtikelDetail;
  const judul = publicLocale === 'en' ? artikel.judul_en || artikel.judul : artikel.judul;
  const isi = publicLocale === 'en' ? artikel.isi_en || artikel.isi : artikel.isi;
  const kategori = publicLocale === 'en'
    ? artikel.kategori_id?.nama_en || artikel.kategori_id?.nama
    : artikel.kategori_id?.nama;
  const menitBaca = Math.max(
    1,
    Math.round(stripHtml(isi, 1_000_000).split(/\s+/).filter(Boolean).length / 200),
  );
  const published = new Date(artikel.publishedAt).toISOString();
  const modified = new Date(
    Math.max(+new Date(artikel.publishedAt), +new Date(artikel.updatedAt)),
  ).toISOString();
  const localePrefix = publicLocale === 'en' ? '/en' : '';
  const pathArtikel = `${localePrefix}/artikel/${artikel.slug}`;
  const image = artikel.ogImage || artikel.coverImage;
  const absoluteImage = image.startsWith('http') ? image : `${SITE_URL}${image.startsWith('/') ? '' : '/'}${image}`;

  const [sejenis, lain] = await Promise.all([
    artikel.kategori_id?._id
      ? Artikel.find({
          ...filterArtikelLayakTampilPublik(),
          _id: { $ne: artikel._id },
          kategori_id: artikel.kategori_id._id,
        })
          .select('slug judul judul_en isi isi_en coverImage publishedAt createdBy')
          .populate('createdBy', 'nama -_id')
          .sort({ publishedAt: -1 })
          .limit(3)
          .lean()
      : Promise.resolve([]),
    Artikel.find({ ...filterArtikelLayakTampilPublik(), _id: { $ne: artikel._id } })
      .select('slug judul judul_en isi isi_en coverImage publishedAt createdBy')
          .populate('createdBy', 'nama -_id')
      .sort({ publishedAt: -1 })
      .limit(3)
      .lean(),
  ]);
  const idSejenis = new Set((sejenis as ArtikelTerkait[]).map((x) => String(x._id)));
  const terkait = [
    ...(sejenis as ArtikelTerkait[]),
    ...(lain as ArtikelTerkait[]).filter((x) => !idSejenis.has(String(x._id))),
  ].slice(0, 3);

  const teksTerkait = (item: ArtikelTerkait) =>
    publicLocale === 'en' ? item.judul_en || item.judul : item.judul;

  return (
    <article className="bg-[#F2F5F0] text-ink">
      <div className="container mx-auto max-w-[800px] px-4 py-12 md:py-16">
        <Link
          href="/artikel"
          className="inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-[#063F2A] hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D4AF37]"
        >
          {t('back')} <span aria-hidden>→</span>
        </Link>

        <header className="mt-8 text-center">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {kategori && (
              <span className="inline-flex items-center rounded-lg bg-[#D4AF37] px-3 py-1 text-xs font-bold text-[#1D2114]">
                {kategori}
              </span>
            )}
            <span className="text-sm text-ink-muted">{t('readTime', { n: menitBaca })}</span>
          </div>
          <h1 className="mx-auto mt-5 max-w-3xl font-display text-3xl font-extrabold leading-tight text-ink md:text-5xl">
            {judul}
          </h1>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-ink-muted">
            <span className="font-semibold text-ink">{artikel.createdBy?.nama || SITE_NAME}</span>
            <span aria-hidden>·</span>
            <time dateTime={published}>
              {dayjs(artikel.publishedAt).locale(dayjsLocale).format('DD MMMM YYYY')}
            </time>
          </div>
        </header>

        {artikel.coverImage && (
          <div className="relative mt-10 aspect-video overflow-hidden rounded-lg bg-[#E3ECE3]">
            <Image
              src={artikel.coverImage}
              alt={`${t('coverAlt')} ${judul}`}
              fill
              sizes="(min-width: 800px) 800px, 100vw"
              className="object-cover"
              preload
            />
          </div>
        )}

        <div
          className="prose-brand mt-10 text-ink [overflow-wrap:anywhere] [&_blockquote]:border-l-4 [&_blockquote]:border-[#D4AF37] [&_blockquote]:not-italic"
          dangerouslySetInnerHTML={{ __html: sanitizeRichText(isi) }}
        />

        {artikel.tags.length > 0 && (
          <div className="mt-10 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-ink-muted">{t('tags')}:</span>
            {artikel.tags.map((tag) => (
              <Link
                key={tag}
                href={`/artikel?tag=${encodeURIComponent(tag)}`}
                className="inline-flex min-h-9 items-center rounded-lg border border-[#CBD9CD] bg-white px-3 py-1.5 text-xs font-semibold text-[#063F2A] hover:bg-[#E3ECE3] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D4AF37]"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}

      </div>

      {terkait.length > 0 && (
        <section className="bg-[#E3ECE3] py-14 md:py-20" aria-labelledby="artikel-terkait">
          <div className="container mx-auto px-4 md:px-8">
            <h2 id="artikel-terkait" className="font-display text-2xl font-extrabold text-ink md:text-3xl">
              {t('relatedTitle')}
            </h2>
            <div className="mt-8 grid gap-8 md:grid-cols-3">
              {terkait.map((item) => (
                <article key={String(item._id)} className="group flex flex-col">
                  <div className="relative aspect-video overflow-hidden rounded-lg bg-white">
                    <Image
                      src={item.coverImage || '/pmb unjani.jpg'}
                      alt={teksTerkait(item)}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                      className="object-cover transition duration-300 group-hover:scale-[1.03] motion-reduce:transition-none"
                      loading="lazy"
                    />
                  </div>
                  <p className="mt-3 text-xs text-ink-muted">
                    {item.createdBy?.nama || SITE_NAME}
                    {' · '}
                    <time dateTime={new Date(item.publishedAt).toISOString()}>
                      {dayjs(item.publishedAt).locale(dayjsLocale).format('DD MMM YYYY')}
                    </time>
                  </p>
                  <h3 className="mt-2 font-display text-base font-bold leading-tight text-ink group-hover:text-[#063F2A]">
                    <Link href={`/artikel/${item.slug}`} className="rounded-lg hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D4AF37]">
                      {teksTerkait(item)}
                    </Link>
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-muted">
                    {stripHtml(publicLocale === 'en' ? item.isi_en || item.isi : item.isi, 120)}
                  </p>
                  <Link
                    href={`/artikel/${item.slug}`}
                    className="mt-3 inline-flex w-fit items-center gap-2 rounded-lg text-sm font-semibold text-[#063F2A] hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D4AF37]"
                  >
                    {tPage('readArticle')} <span aria-hidden>→</span>
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      <JsonLd data={[
        breadcrumbJsonLd([
          { name: tc('beranda'), path: localePrefix || '/' },
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
