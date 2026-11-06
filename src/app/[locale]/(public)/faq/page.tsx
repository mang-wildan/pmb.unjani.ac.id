import { getTranslations } from 'next-intl/server';
import { connectDb } from '@/lib/db';
import { FAQ } from '@/models/FAQ';
import { SectionHeading } from '@/components/ui/Card';
import FAQAccordion, { type FAQItem } from '@/components/public/FAQAccordion';
import JsonLd from '@/components/public/JsonLd';
import { buildMetadata, breadcrumbJsonLd, faqPageJsonLd, type PublicLocale } from '@/lib/seo';

export const revalidate = 60;

const KATEGORI = ['Teknis', 'Biaya', 'Jadwal'] as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: PublicLocale }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'faqPage' });
  return buildMetadata({
    title: t('metaTitle'),
    description: t('metaDesc'),
    path: '/faq',
    locale,
  });
}

export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('faqPage');
  const tk = await getTranslations('faq');
  const prefix = locale === 'en' ? '/en' : '';

  await connectDb().catch(() => null);
  const raw = await FAQ.find({ aktif: true })
    .sort({ kategori: 1, urutan: 1 })
    .lean()
    .catch(() => []);

  const items: FAQItem[] = (raw as any[]).map((item) => ({
    _id: String(item._id),
    pertanyaan: locale === 'en' ? item.pertanyaan_en || item.pertanyaan : item.pertanyaan,
    jawaban: locale === 'en' ? item.jawaban_en || item.jawaban : item.jawaban,
    kategori: item.kategori,
    urutan: item.urutan,
  }));
  const label = { Teknis: tk('teknis'), Biaya: tk('biaya'), Jadwal: tk('jadwal') };

  return (
    <div className="container mx-auto max-w-4xl py-12 md:py-16">
      <SectionHeading level={1} eyebrow={t('eyebrow')} title={t('title')} description={t('desc')} />
      <div className="mt-10 space-y-10">
        {KATEGORI.map((kat) => {
          const daftar = items.filter((i) => i.kategori === kat);
          if (daftar.length === 0) return null;
          return (
            <section key={kat} aria-labelledby={`faq-${kat}`}>
              <h2 id={`faq-${kat}`} className="mb-4 font-display text-2xl font-bold text-ink">
                {label[kat]}
              </h2>
              <FAQAccordion items={daftar} tampilkanTab={false} />
            </section>
          );
        })}
      </div>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: locale === 'en' ? 'Home' : 'Beranda', path: prefix || '/' },
            { name: t('title'), path: `${prefix}/faq` },
          ]),
          ...(faqPageJsonLd(items) ? [faqPageJsonLd(items) as Record<string, unknown>] : []),
        ]}
      />
    </div>
  );
}
