import { getTranslations } from 'next-intl/server';
import { connectDb } from '@/lib/db';
import { Dokumen } from '@/models/Dokumen';
import { muatDataBiaya, muatKalkulatorKosong } from '@/lib/dataBiaya';
import { SectionHeading } from '@/components/ui/Card';
import KalkulatorForm from '@/components/public/KalkulatorForm';
import TabelBiaya from '@/components/public/TabelBiaya';
import DokumenList from '@/components/public/DokumenList';
import JsonLd from '@/components/public/JsonLd';
import { buildMetadata, breadcrumbJsonLd, type PublicLocale } from '@/lib/seo';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ locale: PublicLocale }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'biayaPage' });
  return buildMetadata({
    title: t('metaTitle'),
    description: t('metaDesc'),
    path: '/biaya-kuliah',
    locale,
  });
}

export default async function BiayaKuliahPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('biayaPage');
  const prefix = locale === 'en' ? '/en' : '';

  await connectDb().catch(() => null);
  const [data, kosong, dokumen] = await Promise.all([
    muatDataBiaya(),
    muatKalkulatorKosong(locale),
    Dokumen.find({ kategori: 'biaya', aktif: true })
      .sort({ urutan: 1, updatedAt: -1 })
      .lean()
      .catch(() => []),
  ]);

  return (
    <div className="container mx-auto py-12 md:py-16">
      <SectionHeading level={1} eyebrow={t('eyebrow')} title={t('title')} description={t('desc')} />
      <div className="mt-10">
        <KalkulatorForm
          records={data.records}
          prodiOptions={data.prodiOptions}
          prodiMap={data.prodiMap}
          kelasMap={data.kelasMap}
          jadwalMap={data.jadwalMap}
          kosong={kosong}
        />
      </div>
      <div className="mt-10">
        <TabelBiaya data={data} />
      </div>
      <div className="mt-10 rounded-3xl border border-brand-100 bg-white p-5 shadow-soft">
        <DokumenList items={dokumen as any} locale={locale} iconType="biaya" />
      </div>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: locale === 'en' ? 'Home' : 'Beranda', path: prefix || '/' },
          { name: t('title'), path: `${prefix}/biaya-kuliah` },
        ])}
      />
    </div>
  );
}
