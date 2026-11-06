import { getTranslations } from 'next-intl/server';
import { connectDb } from '@/lib/db';
import { Jadwal } from '@/models/Jadwal';
import '@/models/JalurSeleksi';
import { batasHari } from '@/lib/statusPeriode';
import { SectionHeading } from '@/components/ui/Card';
import JadwalTable from '@/components/public/JadwalTable';
import JsonLd from '@/components/public/JsonLd';
import { buildMetadata, breadcrumbJsonLd, type PublicLocale } from '@/lib/seo';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ locale: PublicLocale }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'jadwalPage' });
  return buildMetadata({
    title: t('metaTitle'),
    description: t('metaDesc'),
    path: '/jadwal-pmb',
    locale,
  });
}

export default async function JadwalPmbPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('jadwalPage');
  const prefix = locale === 'en' ? '/en' : '';

  await connectDb().catch(() => null);
  const jadwal = await Jadwal.find({ status: true, selesai: { $gte: batasHari().awal } })
    .populate('jalur', 'nama')
    .sort({ mulai: 1 })
    .lean()
    .catch(() => []);

  return (
    <div className="container mx-auto py-12 md:py-16">
      <SectionHeading level={1} eyebrow={t('eyebrow')} title={t('title')} description={t('desc')} />
      <div className="mt-10">
        <JadwalTable items={jadwal as any} locale={locale} />
      </div>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: locale === 'en' ? 'Home' : 'Beranda', path: prefix || '/' },
          { name: t('title'), path: `${prefix}/jadwal-pmb` },
        ])}
      />
    </div>
  );
}
