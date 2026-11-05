import type { FilterQuery } from 'mongoose';
import { getTranslations } from 'next-intl/server';
import ArtikelCard from '@/components/public/ArtikelCard';
import JsonLd from '@/components/public/JsonLd';
import { Card, SectionHeading } from '@/components/ui/Card';
import { Link } from '@/i18n/navigation';
import { escapeRegex } from '@/lib/activityLog';
import { connectDb } from '@/lib/db';
import { breadcrumbJsonLd, buildMetadata, type PublicLocale } from '@/lib/seo';
import {
  Artikel,
  filterArtikelLayakTampilPublik,
  type ArtikelDoc,
} from '@/models/Artikel';
import '@/models/AdminUser';
import { KategoriArtikel } from '@/models/KategoriArtikel';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 9;

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
  const t = await getTranslations('artikelPage');
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

  const [kategori, total] = await Promise.all([
    KategoriArtikel.find().sort({ nama: 1 }).lean(),
    Artikel.countDocuments(filter),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const hasil = await Artikel.find(filter)
    .select('slug judul judul_en isi isi_en coverImage publishedAt createdBy')
    .populate('createdBy', 'nama -_id')
    .sort({ publishedAt: -1 })
    .skip((currentPage - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE)
    .lean();
  const items = hasil as unknown as ArtikelHasil[];

  return (
    <div className="container mx-auto py-12 md:py-16">
      <SectionHeading level={1} eyebrow={t('eyebrow')} title={t('title')} description={t('desc')} />

      <form method="get" className="mt-8 grid gap-3 rounded-2xl border border-brand-100 bg-white p-4 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.5fr)_auto]">
        <input
          type="search"
          name="q"
          defaultValue={q}
          maxLength={80}
          placeholder={t('searchPlaceholder')}
          className="rounded-full border border-brand-200 px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
        <label className="sr-only" htmlFor="kategori-artikel">{t('categoryLabel')}</label>
        <select
          id="kategori-artikel"
          name="kategori"
          defaultValue={kategoriSlug}
          className="rounded-full border border-brand-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        >
          <option value="">{t('allCategories')}</option>
          {kategori.map((item) => (
            <option key={String(item._id)} value={item.slug}>
              {publicLocale === 'en' ? item.nama_en || item.nama : item.nama}
            </option>
          ))}
        </select>
        {tag && <input type="hidden" name="tag" value={tag} />}
        <button
          aria-label={t('searchPlaceholder')}
          className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
        >
          <i className="fa-solid fa-magnifying-glass" aria-hidden />
        </button>
      </form>

      {tag && (
        <div className="mt-4 flex items-center gap-3 text-sm">
          <span className="rounded-full bg-brand-50 px-3 py-1.5 font-semibold text-brand-700">{t('activeTag', { tag })}</span>
          <Link href={hrefHalaman({ q, kategori: kategoriSlug }, 1)} className="text-ink-muted hover:text-brand-700">×</Link>
        </div>
      )}

      <div className="mt-10">
        {items.length ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <ArtikelCard
                key={String(item._id)}
                locale={publicLocale}
                item={{
                  slug: item.slug,
                  judul: publicLocale === 'en' ? item.judul_en || item.judul : item.judul,
                  isi: publicLocale === 'en' ? item.isi_en || item.isi : item.isi,
                  coverImage: item.coverImage,
                  namaPenulis: item.createdBy?.nama || 'PMB UNJANI',
                  publishedAt: item.publishedAt,
                }}
              />
            ))}
          </div>
        ) : (
          <Card><p className="text-ink-muted">{t('empty')}</p></Card>
        )}
      </div>

      {totalPages > 1 && (
        <nav className="mt-10 flex items-center justify-center gap-4" aria-label={t('page', { page: currentPage, total: totalPages })}>
          {currentPage > 1 && <Link href={hrefHalaman({ q, kategori: kategoriSlug, tag }, currentPage - 1)} className="rounded-full border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50">{t('previous')}</Link>}
          <span className="text-sm text-ink-muted">{t('page', { page: currentPage, total: totalPages })}</span>
          {currentPage < totalPages && <Link href={hrefHalaman({ q, kategori: kategoriSlug, tag }, currentPage + 1)} className="rounded-full border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50">{t('next')}</Link>}
        </nav>
      )}

      <JsonLd data={breadcrumbJsonLd([{ name: publicLocale === 'en' ? 'Home' : 'Beranda', path: publicLocale === 'en' ? '/en' : '/' }, { name: t('title'), path: publicLocale === 'en' ? '/en/artikel' : '/artikel' }])} />
    </div>
  );
}
