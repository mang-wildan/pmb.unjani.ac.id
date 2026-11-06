import { getTranslations } from 'next-intl/server';
import { connectDb } from '@/lib/db';
import { JalurSeleksi } from '@/models/JalurSeleksi';
import { SectionHeading } from '@/components/ui/Card';
import JalurList from '@/components/public/JalurList';
import JsonLd from '@/components/public/JsonLd';
import { buildMetadata, breadcrumbJsonLd, type PublicLocale } from '@/lib/seo';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ locale: PublicLocale }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'jalurPage' });
  return buildMetadata({
    title: t('metaTitle'),
    description: t('metaDesc'),
    path: '/jalur-masuk',
    locale,
  });
}

export default async function JalurMasukPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('jalurPage');
  const prefix = locale === 'en' ? '/en' : '';

  await connectDb().catch(() => null);
  const jalur = await JalurSeleksi.find({ aktif: true })
    .sort({ urutan: 1, nama: 1 })
    .lean()
    .catch(() => []);

  return (
    <div className="container mx-auto py-12 md:py-16">
      <SectionHeading level={1} eyebrow={t('eyebrow')} title={t('title')} description={t('desc')} />
      <div className="mt-10">
        <JalurList items={jalur as any} locale={locale} tingkatJudul="h2" />
      </div>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: locale === 'en' ? 'Home' : 'Beranda', path: prefix || '/' },
          { name: t('title'), path: `${prefix}/jalur-masuk` },
        ])}
      />
    </div>
  );
}
