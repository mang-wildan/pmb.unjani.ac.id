import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import Image from 'next/image';
import { connectDb } from '@/lib/db';
import { Pengumuman } from '@/models/Pengumuman';
import { PageContent } from '@/models/PageContent';
import { getSettings } from '@/models/Settings';
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

// Fallback aset kampus, sama dengan kontak/HeroSlider (bukan path upload CMS).
const FOTO_KAMPUS_BAWAAN = '/pmb unjani.jpg';

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
  const tc = await getTranslations('common');
  const dayjsLocale = locale === 'en' ? 'en' : 'id';

  await connectDb().catch(() => null);
  const p = await Pengumuman.findOne({ slug, aktif: true }).lean();
  if (!p) notFound();

  const judul = locale === 'en' ? ((p as any).judul_en || p.judul) : p.judul;
  const ringkasan = locale === 'en' ? ((p as any).ringkasan_en || p.ringkasan) : p.ringkasan;
  const konten = locale === 'en' ? ((p as any).konten_en || p.konten) : p.konten;
  const published = new Date(p.publishedAt as Date).toISOString();

  const [lainnya, hero, settings] = await Promise.all([
    Pengumuman.find({ aktif: true, _id: { $ne: p._id } })
      .sort({ pinned: -1, publishedAt: -1 })
      .limit(3)
      .lean()
      .catch(() => []),
    PageContent.findOne({ kunci: 'hero' }).select('data').lean().catch(() => null),
    getSettings().catch(() => null),
  ]);

  const heroImages = ((hero?.data || {}) as { heroImages?: string[] }).heroImages || [];
  const fotoHero = (p.coverImage as string) || heroImages[0] || FOTO_KAMPUS_BAWAAN;
  const urlDaftar = settings?.urlPendaftaran || 'https://pendaftaran.unjani.ac.id/loginnew';

  return (
    <div className="bg-[#F2F5F0] text-ink">
      <section
        data-public-hero
        aria-labelledby="pengumuman-detail-title"
        className="relative isolate flex min-h-[480px] flex-col justify-end overflow-hidden bg-[#06281D] text-white md:min-h-[520px]"
      >
        <Image
          src={fotoHero}
          alt=""
          fill
          preload
          sizes="100vw"
          className="absolute inset-0 -z-20 object-cover"
        />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-t from-[#06281D] via-[#06281D]/60 to-[#06281D]/30" aria-hidden />
        <div className="container mx-auto pb-14 pt-24 md:pb-20">
          <nav aria-label={t('breadcrumbLabel')} className="text-xs text-white/80">
            <Link href="/" className="rounded-lg hover:underline">{tc('beranda')}</Link>
            <span aria-hidden> / </span>
            <Link href="/pengumuman" className="rounded-lg hover:underline">{t('breadcrumb')}</Link>
            <span aria-hidden> / </span>
            <span aria-current="page">{t('detailCrumb')}</span>
          </nav>
          <h1 id="pengumuman-detail-title" className="mt-5 max-w-4xl font-display text-3xl font-extrabold leading-tight sm:text-4xl md:text-5xl">
            {judul}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/85">
            {p.pinned && (
              <span className="inline-flex items-center rounded-lg bg-[#D4AF37] px-3 py-1 text-xs font-bold text-[#1D2114]">
                {t('penting')}
              </span>
            )}
            <time dateTime={published}>
              {t('diterbitkan')}{' '}
              {dayjs(p.publishedAt as Date).locale(dayjsLocale).format('DD MMM YYYY')}
            </time>
          </div>
        </div>
      </section>

      <section className="container mx-auto py-14 md:py-20">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
          <div className="min-w-0">
            <Link
              href="/pengumuman"
              className="inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-[#063F2A] hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D4AF37]"
            >
              {t('kembali')} <span aria-hidden>→</span>
            </Link>

            {ringkasan && <p className="mt-6 text-lg leading-relaxed text-ink-muted">{ringkasan}</p>}

            <div
              className="prose-brand mt-8 text-ink"
              dangerouslySetInnerHTML={{ __html: sanitizeRichText(konten || '') }}
            />
          </div>

          <aside className="grid gap-6">
            <div className="rounded-lg bg-[#D4AF37] p-6 md:p-8">
              <h2 className="font-display text-2xl font-bold text-[#1D2114]">{t('sidebarTitle')}</h2>
              <p className="mt-3 text-sm leading-relaxed text-[#1D2114]">{t('sidebarDesc')}</p>
              <a
                href={urlDaftar}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#10281D] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#06281D] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#063F2A] motion-reduce:transition-none"
              >
                {tc('daftarSekarang')} <span aria-hidden>→</span>
              </a>
            </div>

            {lainnya.length > 0 && (
              <div className="rounded-lg bg-white p-6 md:p-8">
                <h2 className="font-display text-xl font-bold text-ink">{t('lainnyaTitle')}</h2>
                <ul className="mt-4 divide-y divide-[#CBD9CD]">
                  {lainnya.map((item) => (
                    <li key={String(item._id)} className="py-3">
                      <time
                        className="text-xs text-ink-muted"
                        dateTime={new Date(item.publishedAt as Date).toISOString()}
                      >
                        {dayjs(item.publishedAt as Date).locale(dayjsLocale).format('DD MMM YYYY')}
                      </time>
                      <Link
                        href={`/pengumuman/${item.slug}`}
                        className="mt-1 block font-semibold text-ink hover:text-[#063F2A] hover:underline"
                      >
                        {locale === 'en' ? ((item as any).judul_en || item.judul) : item.judul}
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/pengumuman"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-[#063F2A] hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D4AF37]"
                >
                  {t('lainnyaSemua')} <span aria-hidden>→</span>
                </Link>
              </div>
            )}
          </aside>
        </div>
      </section>

      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: tc('beranda'), path: '/' },
            { name: t('breadcrumb'), path: '/pengumuman' },
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
    </div>
  );
}
