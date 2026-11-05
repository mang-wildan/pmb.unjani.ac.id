import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import ArtikelCard from '@/components/public/ArtikelCard';
import { SectionHeading } from '@/components/ui/Card';
import Reveal from '@/components/public/Reveal';

type ArtikelSectionItem = {
  _id: { toString(): string } | string;
  slug: string;
  judul: string;
  judul_en?: string;
  isi: string;
  isi_en?: string;
  coverImage: string;
  publishedAt: Date | string;
  createdBy?: { nama?: string } | null;
};

export default async function ArtikelSection({
  items,
  locale,
}: {
  items: ArtikelSectionItem[];
  locale: string;
}) {
  if (!items.length) return null;

  const t = await getTranslations('artikelSection');
  const publicLocale = locale === 'en' ? 'en' : 'id';

  return (
    <section className="container mx-auto py-16" aria-labelledby="artikel-heading">
      <Reveal>
        <SectionHeading
          id="artikel-heading"
          eyebrow={t('eyebrow')}
          title={t('title')}
          description={t('desc')}
        />
      </Reveal>
      <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item, indeks) => (
          <Reveal key={String(item._id)} urutan={indeks}>
            <ArtikelCard
              locale={publicLocale}
              item={{
                slug: item.slug,
                judul:
                  publicLocale === 'en' ? item.judul_en?.trim() || item.judul : item.judul,
                isi: publicLocale === 'en' ? item.isi_en?.trim() || item.isi : item.isi,
                coverImage: item.coverImage,
                namaPenulis: item.createdBy?.nama || 'PMB UNJANI',
                publishedAt: item.publishedAt,
              }}
            />
          </Reveal>
        ))}
      </div>
      <div className="mt-8">
        <Link
          href="/artikel"
          className="inline-flex items-center gap-2 font-semibold text-brand-700 hover:text-brand-600"
        >
          {t('viewAll')}
        </Link>
      </div>
    </section>
  );
}
