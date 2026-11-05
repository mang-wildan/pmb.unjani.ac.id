import { getTranslations } from 'next-intl/server';
import { connectDb } from '@/lib/db';
import { Pengumuman } from '@/models/Pengumuman';
import PengumumanList from '@/components/public/PengumumanList';
import { SectionHeading } from '@/components/ui/Card';
import { buildMetadata, breadcrumbJsonLd, type PublicLocale } from '@/lib/seo';
import JsonLd from '@/components/public/JsonLd';

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

export default async function PengumumanListPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('pengumumanPage');

  await connectDb().catch(() => null);
  const items = await Pengumuman.find({ aktif: true })
    .sort({ pinned: -1, publishedAt: -1 })
    .lean();

  return (
    <div className="container mx-auto py-12 md:py-16">
      <SectionHeading level={1} eyebrow={t('eyebrow')} title={t('title')} description={t('desc')} />
      <div className="mt-10">
        <PengumumanList items={items as any} locale={locale} />
      </div>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Beranda', path: '/' },
          { name: t('title'), path: '/pengumuman' },
        ])}
      />
    </div>
  );
}
