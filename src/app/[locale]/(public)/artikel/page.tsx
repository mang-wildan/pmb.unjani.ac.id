import type { FilterQuery } from 'mongoose';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import JsonLd from '@/components/public/JsonLd';
import { Link } from '@/i18n/navigation';
import { escapeRegex } from '@/lib/activityLog';
import { connectDb } from '@/lib/db';
import { breadcrumbJsonLd, buildMetadata, SITE_NAME, type PublicLocale } from '@/lib/seo';
import { stripHtml } from '@/lib/sanitize';
import { PageContent } from '@/models/PageContent';
import {
  Artikel,
  filterArtikelLayakTampilPublik,
  type ArtikelDoc,
} from '@/models/Artikel';
import '@/models/AdminUser';
import { KategoriArtikel } from '@/models/KategoriArtikel';

// Fallback aset kampus, sama dengan hero kontak/pengumuman (bukan path upload CMS).
const FOTO_KAMPUS_BAWAAN = '/pmb unjani.jpg';
const PAGE_SIZE = 9;

export const dynamic = 'force-dynamic';

type SearchParams = {
  q?: string;
  kategori?: string;
  tag?: string;
  page?: string;
};

type ArtikelHasil = {
  _id: unknown;
  slug: string;
  judul: string;
  judul_en?: string;
  isi: string;
  isi_en?: string;
  coverImage: string;
  publishedAt: Date;
  createdBy?: { nama?: string } | null;
  kategori_id?: { nama?: string; nama_en?: string } | null;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: PublicLocale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'artikelPage' });
  return buildMetadata({
    title: t('metaTitle'),
    description: t('metaDesc'),
    path: '/artikel',
    locale,
  });
}

function hrefHalaman(params: SearchParams, page: number) {
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q);
  if (params.kategori) query.set('kategori', params.kategori);
  if (params.tag) query.set('tag', params.tag);
  if (page > 1) query.set('page', String(page));
  const suffix = query.toString();
  return suffix ? `/artikel?${suffix}` : '/artikel';
}

export default async function ArtikelPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [K in keyof SearchParams]?: string | string[] }>;
}) {
  const [{ locale }, rawSearch] = await Promise.all([params, searchParams]);
  const publicLocale: PublicLocale = locale === 'en' ? 'en' : 'id';
  const dayjsLocale = publicLocale;
  const t = await getTranslations('artikelPage');
  const tc = await getTranslations('common');
  // Parameter berulang (?q=a&q=b) tiba sebagai array; ambil nilai pertama agar tidak error 500 (FR-28).
  const pertama = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || '';
  const q = pertama(rawSearch.q).trim().slice(0, 80);
  const kategoriSlug = pertama(rawSearch.kategori).trim().slice(0, 80);
  const tag = pertama(rawSearch.tag).trim().slice(0, 60);
  const requestedPage = Math.max(1, Number.parseInt(pertama(rawSearch.page) || '1', 10) || 1);

  await connectDb();
  const kategoriTerpilih = kategoriSlug
    ? await KategoriArtikel.findOne({ slug: kategoriSlug }).select('_id').lean()
    : null;
  const tambahan: FilterQuery<ArtikelDoc>[] = [];
  if (q) {
    const pola = new RegExp(escapeRegex(q), 'i');
    tambahan.push({ $or: [{ judul: pola }, { judul_en: pola }] });
  }
  if (kategoriSlug) tambahan.push({ kategori_id: kategoriTerpilih?._id || null });
  if (tag) tambahan.push({ tags: tag });
  const filter: FilterQuery<ArtikelDoc> = tambahan.length
    ? { $and: [filterArtikelLayakTampilPublik(), ...tambahan] }
    : filterArtikelLayakTampilPublik();

  // Artikel unggulan: pinned terbaru dari hasil filter aktif. Grid mengecualikannya agar tidak ganda.
  const unggulan = (await Artikel.findOne({ ...filter, pinned: true })
    .select('slug judul judul_en isi isi_en coverImage publishedAt createdBy kategori_id')
    .populate('createdBy', 'nama -_id')
    .populate('kategori_id', 'nama nama_en -_id')
    .sort({ publishedAt: -1 })
    .lean()) as unknown as ArtikelHasil | null;
  const filterDaftar: FilterQuery<ArtikelDoc> = unggulan
    ? { ...filter, _id: { $ne: unggulan._id } }
    : filter;

  const [kategori, daftarTagMentah, total, hero] = await Promise.all([
    KategoriArtikel.find().sort({ nama: 1 }).lean(),
    Artikel.distinct('tags', filterArtikelLayakTampilPublik()),
    Artikel.countDocuments(filterDaftar),
    PageContent.findOne({ kunci: 'hero' }).select('data').lean().catch(() => null),
  ]);
  const daftarTag = (daftarTagMentah as string[]).filter(Boolean).sort((a, b) => a.localeCompare(b));
  const heroImages = ((hero?.data || {}) as { heroImages?: string[] }).heroImages || [];
  const fotoHero = heroImages[0] || FOTO_KAMPUS_BAWAAN;

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const hasil = await Artikel.find(filterDaftar)
    .select('slug judul judul_en isi isi_en coverImage publishedAt createdBy kategori_id')
    .populate('createdBy', 'nama -_id')
    .populate('kategori_id', 'nama nama_en -_id')
    .sort({ publishedAt: -1 })
    .skip((currentPage - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE)
    .lean();
  const items = hasil as unknown as ArtikelHasil[];
  const awalNomor = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  const nomorHalaman = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => awalNomor + i);

  const teks = (item: ArtikelHasil, kunci: 'judul' | 'isi') => {
    if (publicLocale === 'en') {
      const en = kunci === 'judul' ? item.judul_en : item.isi_en;
      if (en) return en;
    }
    return kunci === 'judul' ? item.judul : item.isi;
  };
  const namaKategori = (item: ArtikelHasil) =>
    publicLocale === 'en'
      ? item.kategori_id?.nama_en || item.kategori_id?.nama
      : item.kategori_id?.nama;
  const tanggal = (item: ArtikelHasil) => new Date(item.publishedAt);

  return (
    <div className="bg-[#F2F5F0] text-ink">
      <section
        data-public-hero
        aria-labelledby="artikel-title"
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
            <Link href="/" className="rounded-lg hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D4AF37]">{tc('beranda')}</Link>
            <span aria-hidden> / </span>
            <span aria-current="page">{t('breadcrumb')}</span>
          </nav>
          <p className="mt-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">
            <span aria-hidden className="h-0.5 w-6 bg-[#D4AF37]" />
            {t('eyebrow')}
          </p>
          <h1 id="artikel-title" className="mt-4 font-display text-4xl font-extrabold leading-tight sm:text-5xl">
            {t('title')}
          </h1>
          <p className="mt-3 max-w-xl text-base text-white/85 md:text-lg">{t('desc')}</p>
        </div>
      </section>

      <section className="container mx-auto py-14 md:py-20">
        <form
          method="get"
          role="search"
          className="grid items-center gap-3 rounded-lg border border-[#CBD9CD] bg-white p-4 md:grid-cols-[minmax(0,1fr)_minmax(200px,0.45fr)_auto]"
        >
          <div>
            <label htmlFor="cari-artikel" className="sr-only">{t('searchPlaceholder')}</label>
            <input
              id="cari-artikel"
              type="search"
              name="q"
              defaultValue={q}
              maxLength={80}
              placeholder={t('searchPlaceholder')}
              className="w-full rounded-lg border border-[#CBD9CD] px-4 py-2.5 text-sm outline-none focus:border-[#063F2A] focus:ring-2 focus:ring-[#063F2A]/20"
            />
          </div>
          <div>
            <label htmlFor="kategori-artikel" className="sr-only">{t('categoryLabel')}</label>
            <select
              id="kategori-artikel"
              name="kategori"
              defaultValue={kategoriSlug}
              className="w-full rounded-lg border border-[#CBD9CD] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#063F2A] focus:ring-2 focus:ring-[#063F2A]/20"
            >
              <option value="">{t('allCategories')}</option>
              {kategori.map((item) => (
                <option key={String(item._id)} value={item.slug}>
                  {publicLocale === 'en' ? item.nama_en || item.nama : item.nama}
                </option>
              ))}
            </select>
          </div>
          {tag && <input type="hidden" name="tag" value={tag} />}
          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#063F2A] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#06281D] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D4AF37] motion-reduce:transition-none"
          >
            {t('search')}
          </button>
        </form>

        <nav
          aria-label={t('tags')}
          className="mt-5 flex flex-nowrap items-center gap-2 overflow-x-auto py-1 md:flex-wrap md:overflow-visible"
        >
          <Link
            href={hrefHalaman({ q, kategori: kategoriSlug }, 1)}
            aria-current={tag ? undefined : 'page'}
            className={`inline-flex min-h-9 shrink-0 items-center whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D4AF37] ${
              tag
                ? 'border border-[#CBD9CD] bg-white text-[#063F2A] hover:bg-[#E3ECE3]'
                : 'bg-[#063F2A] text-white'
            }`}
          >
            {t('allTags')}
          </Link>
          {daftarTag.map((item) => (
            <Link
              key={item}
              href={hrefHalaman({ q, kategori: kategoriSlug, tag: item }, 1)}
              aria-current={tag === item ? 'page' : undefined}
              className={`inline-flex min-h-9 shrink-0 items-center whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D4AF37] ${
                tag === item
                  ? 'bg-[#063F2A] text-white'
                  : 'border border-[#CBD9CD] bg-white text-[#063F2A] hover:bg-[#E3ECE3]'
              }`}
            >
              {item}
            </Link>
          ))}
        </nav>

        {unggulan && (
          <article className="mt-10 grid overflow-hidden rounded-lg bg-white md:grid-cols-2">
            <div className="relative aspect-[16/10] md:aspect-auto md:min-h-[320px]">
              <Image
                src={unggulan.coverImage || fotoHero}
                alt={teks(unggulan, 'judul')}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
            <div className="flex flex-col justify-center p-6 md:p-9">
              {namaKategori(unggulan) && (
                <span className="inline-flex w-fit items-center rounded-lg bg-[#D4AF37] px-3 py-1 text-xs font-bold text-[#1D2114]">
                  {namaKategori(unggulan)}
                </span>
              )}
              <p className="mt-3 text-xs text-ink-muted">
                {unggulan.createdBy?.nama || SITE_NAME}
                {' · '}
                <time dateTime={tanggal(unggulan).toISOString()}>
                  {dayjs(tanggal(unggulan)).locale(dayjsLocale).format('DD MMM YYYY')}
                </time>
              </p>
              <h2 className="mt-3 font-display text-2xl font-extrabold leading-tight md:text-3xl">
                <Link href={`/artikel/${unggulan.slug}`} className="rounded-lg hover:text-[#063F2A] hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D4AF37]">
                  {teks(unggulan, 'judul')}
                </Link>
              </h2>
              <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink-muted">
                {stripHtml(teks(unggulan, 'isi'), 220)}
              </p>
              <Link
                href={`/artikel/${unggulan.slug}`}
                className="mt-5 inline-flex min-h-11 w-fit items-center gap-2 rounded-lg text-sm font-semibold text-[#063F2A] hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D4AF37]"
              >
                {t('readArticle')} <span aria-hidden>→</span>
              </Link>
            </div>
          </article>
        )}

        {items.length > 0 ? (
          <div className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <article key={String(item._id)} className="group flex flex-col">
                <div className="relative aspect-video overflow-hidden rounded-lg bg-[#E3ECE3]">
                  {item.coverImage ? (
                    <Image
                      src={item.coverImage}
                      alt={teks(item, 'judul')}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                      className="object-cover transition duration-300 group-hover:scale-[1.03] motion-reduce:transition-none"
                      loading="lazy"
                    />
                  ) : (
                    <Image
                      src={fotoHero}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                      className="object-cover"
                      loading="lazy"
                    />
                  )}
                </div>
                <p className="mt-4 text-xs text-ink-muted">
                  {item.createdBy?.nama || SITE_NAME}
                  {' · '}
                  <time dateTime={tanggal(item).toISOString()}>
                    {dayjs(tanggal(item)).locale(dayjsLocale).format('DD MMM YYYY')}
                  </time>
                </p>
                <h2 className="mt-2 font-display text-lg font-bold leading-tight text-ink group-hover:text-[#063F2A] md:text-xl">
                  <Link href={`/artikel/${item.slug}`} className="rounded-lg hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D4AF37]">
                    {teks(item, 'judul')}
                  </Link>
                </h2>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-muted">
                  {stripHtml(teks(item, 'isi'), 140)}
                </p>
                <Link
                  href={`/artikel/${item.slug}`}
                  className="mt-3 inline-flex w-fit items-center gap-2 rounded-lg text-sm font-semibold text-[#063F2A] hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D4AF37]"
                >
                  {t('readArticle')} <span aria-hidden>→</span>
                </Link>
              </article>
            ))}
          </div>
        ) : (
          !unggulan && (
            <p className="mt-10 rounded-lg border border-[#CBD9CD] bg-white p-6 text-ink-muted">{t('empty')}</p>
          )
        )}

        {totalPages > 1 && (
          <nav aria-label={t('paginationLabel')} className="mt-12 flex flex-wrap items-center justify-between gap-4">
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
                      href={hrefHalaman({ q, kategori: kategoriSlug, tag }, n)}
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
                href={hrefHalaman({ q, kategori: kategoriSlug, tag }, currentPage + 1)}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#CBD9CD] bg-white px-5 py-2.5 text-sm font-semibold text-[#063F2A] hover:bg-[#E3ECE3] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D4AF37]"
              >
                {t('next')} <span aria-hidden>→</span>
              </Link>
            )}
          </nav>
        )}

        <JsonLd
          data={breadcrumbJsonLd([
            { name: tc('beranda'), path: publicLocale === 'en' ? '/en' : '/' },
            { name: t('title'), path: publicLocale === 'en' ? '/en/artikel' : '/artikel' },
          ])}
        />
      </section>
    </div>
  );
}
