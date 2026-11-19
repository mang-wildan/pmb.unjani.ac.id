import type { FilterQuery } from 'mongoose';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { connectDb } from '@/lib/db';
import { PageContent } from '@/models/PageContent';
import { Pengumuman, type PengumumanDoc } from '@/models/Pengumuman';
import { buildMetadata, breadcrumbJsonLd, type PublicLocale } from '@/lib/seo';
import JsonLd from '@/components/public/JsonLd';

// Fallback aset kampus, sama dengan kontak/HeroSlider (bukan path upload CMS).
const FOTO_KAMPUS_BAWAAN = '/pmb unjani.jpg';
const PAGE_SIZE = 6;

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ locale: PublicLocale }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pengumumanPage' });
  return buildMetadata({
    title: t('metaTitle'),
    description: t('metaDesc'),
    path: '/pengumuman',
    locale,
  });
}

export default async function PengumumanListPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const [{ locale }, rawSearch] = await Promise.all([params, searchParams]);
  const t = await getTranslations('pengumumanPage');
  const tc = await getTranslations('common');
  const dayjsLocale = locale === 'en' ? 'en' : 'id';

  // Parameter berulang (?page=1&page=2) tiba sebagai array; ambil nilai pertama.
  const pertama = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || '';
  const diminta = Math.max(1, Number.parseInt(pertama(rawSearch.page) || '1', 10) || 1);

  await connectDb().catch(() => null);

  // Kartu utama: pengumuman pinned terbaru (filter pinned dipertahankan).
  const highlight = await Pengumuman.findOne({ aktif: true, pinned: true })
    .sort({ publishedAt: -1 })
    .lean()
    .catch(() => null);

  const filter: FilterQuery<PengumumanDoc> = highlight
    ? { aktif: true, _id: { $ne: highlight._id } }
    : { aktif: true };

  const [total, hero] = await Promise.all([
    Pengumuman.countDocuments(filter).catch(() => 0),
    PageContent.findOne({ kunci: 'hero' }).select('data').lean().catch(() => null),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(diminta, totalPages);
  const items = (await Pengumuman.find(filter)
    .sort({ pinned: -1, publishedAt: -1 })
    .skip((currentPage - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE)
    .lean()
    .catch(() => [])) as PengumumanDoc[];

  const heroImages = ((hero?.data || {}) as { heroImages?: string[] }).heroImages || [];
  const fotoHero = heroImages[0] || FOTO_KAMPUS_BAWAAN;

  const teks = (p: PengumumanDoc, kunci: 'judul' | 'ringkasan') =>
    (locale === 'en' && (p as any)[`${kunci}_en`]) || (p as any)[kunci];

  const tanggal = (p: PengumumanDoc) => new Date(p.publishedAt as Date);
  const hrefHalaman = (page: number) => (page > 1 ? `/pengumuman?page=${page}` : '/pengumuman');
  const awalNomor = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  const nomorHalaman = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => awalNomor + i);

  return (
    <div className="bg-[#F2F5F0] text-ink">
      <section
        data-public-hero
        aria-labelledby="pengumuman-title"
        className="relative isolate flex min-h-[440px] flex-col justify-end overflow-hidden bg-[#06281D] text-white md:min-h-[480px]"
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
            <span aria-current="page">{t('breadcrumb')}</span>
          </nav>
          <p className="mt-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">
            <span aria-hidden className="h-0.5 w-6 bg-[#D4AF37]" />
            {t('eyebrow')}
          </p>
          <h1 id="pengumuman-title" className="mt-4 font-display text-4xl font-extrabold leading-tight sm:text-5xl">
            {t('title')}
          </h1>
          <p className="mt-3 max-w-xl text-base text-white/85 md:text-lg">{t('desc')}</p>
        </div>
      </section>

      <section className="container mx-auto py-14 md:py-20">
        {highlight && (
          <article className="overflow-hidden rounded-lg bg-[#063F2A] text-white">
            <div className="grid md:grid-cols-2">
              <div className="flex flex-col justify-center p-6 md:p-9">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center rounded-lg bg-[#D4AF37] px-3 py-1 text-xs font-bold text-[#1D2114]">
                    {t('penting')}
                  </span>
                  <time className="text-sm text-white/80" dateTime={tanggal(highlight).toISOString()}>
                    {t('diterbitkan')}, {dayjs(tanggal(highlight)).locale(dayjsLocale).format('DD MMM YYYY')}
                  </time>
                </div>
                <h2 className="mt-4 font-display text-2xl font-extrabold leading-tight md:text-3xl">
                  <Link href={`/pengumuman/${highlight.slug}`} className="rounded-lg hover:text-[#D4AF37]">
                    {teks(highlight, 'judul')}
                  </Link>
                </h2>
                {teks(highlight, 'ringkasan') && (
                  <p className="mt-3 max-w-prose text-sm leading-relaxed text-white/85">
                    {teks(highlight, 'ringkasan')}
                  </p>
                )}
                <Link
                  href={`/pengumuman/${highlight.slug}`}
                  className="mt-6 inline-flex min-h-11 w-fit items-center gap-2 rounded-lg bg-[#D4AF37] px-5 py-3 text-sm font-semibold text-[#1D2114] transition-colors hover:bg-[#C4A030] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white motion-reduce:transition-none"
                >
                  {t('bacaSelengkapnya')}
                </Link>
              </div>
              <div className="relative min-h-[220px] md:min-h-full">
                <Image
                  src={highlight.coverImage || fotoHero}
                  alt={teks(highlight, 'judul')}
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
            </div>
          </article>
        )}

        {items.length > 0 ? (
          <ul className="mt-10 divide-y divide-[#CBD9CD] border-y border-[#CBD9CD]">
            {items.map((p) => (
              <li key={String(p._id)}>
                <Link
                  href={`/pengumuman/${p.slug}`}
                  className="group flex flex-col gap-3 rounded-lg py-6 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D4AF37] sm:flex-row sm:items-center sm:gap-6"
                >
                  <time className="block sm:w-20 sm:shrink-0" dateTime={tanggal(p).toISOString()}>
                    <span className="block font-display text-4xl font-extrabold leading-none text-[#063F2A]">
                      {dayjs(tanggal(p)).locale(dayjsLocale).format('DD')}
                    </span>
                    <span className="mt-1 block text-xs text-ink-muted">
                      {dayjs(tanggal(p)).locale(dayjsLocale).format('MMM YYYY')}
                    </span>
                  </time>
                  <div className="min-w-0 flex-1">
                    {p.pinned && (
                      <span className="mb-2 inline-flex items-center rounded-lg bg-[#D4AF37] px-2.5 py-1 text-xs font-bold text-[#1D2114]">
                        {t('penting')}
                      </span>
                    )}
                    <h2 className="font-display text-lg font-bold leading-tight text-ink group-hover:text-[#063F2A] md:text-xl">
                      {teks(p, 'judul')}
                    </h2>
                    {teks(p, 'ringkasan') && (
                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-muted">
                        {teks(p, 'ringkasan')}
                      </p>
                    )}
                  </div>
                  <span aria-hidden className="text-xl text-[#063F2A] sm:self-center">→</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          !highlight && (
            <p className="rounded-lg border border-[#CBD9CD] bg-white p-6 text-ink-muted">{t('empty')}</p>
          )
        )}

        {totalPages > 1 && (
          <nav aria-label={t('paginationLabel')} className="mt-10 flex flex-wrap items-center justify-between gap-4">
            <ul className="flex flex-wrap items-center gap-2">
              {nomorHalaman.map((n) =>
                n === currentPage ? (
                  <li key={n}>
                    <span
                      aria-current="page"
                      className="inline-flex h-10 min-w-10 items-center justify-center rounded-lg bg-[#063F2A] px-3 text-sm font-semibold text-white"
                    >
                      {n}
                    </span>
                  </li>
                ) : (
                  <li key={n}>
                    <Link
                      href={hrefHalaman(n)}
                      aria-label={`${t('paginationLabel')} ${n}`}
                      className="inline-flex h-10 min-w-10 items-center justify-center rounded-lg border border-[#CBD9CD] bg-white px-3 text-sm font-semibold text-[#063F2A] hover:bg-[#E3ECE3] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D4AF37]"
                    >
                      {n}
                    </Link>
                  </li>
                ),
              )}
            </ul>
            {currentPage < totalPages && (
              <Link
                href={hrefHalaman(currentPage + 1)}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#CBD9CD] bg-white px-5 py-2.5 text-sm font-semibold text-[#063F2A] hover:bg-[#E3ECE3] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D4AF37]"
              >
                {t('next')} <span aria-hidden>→</span>
              </Link>
            )}
          </nav>
        )}
      </section>

      <JsonLd
        data={breadcrumbJsonLd([
          { name: tc('beranda'), path: '/' },
          { name: t('title'), path: '/pengumuman' },
        ])}
      />
    </div>
  );
}
