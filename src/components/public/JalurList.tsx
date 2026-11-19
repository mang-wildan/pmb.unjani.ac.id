import { getTranslations } from 'next-intl/server';
import { Card } from '@/components/ui/Card';
import { sanitizeRichText } from '@/lib/sanitize';
import type { JalurSeleksiDoc } from '@/models/JalurSeleksi';
import JalurAccordion, { type JalurAccordionItem } from './JalurAccordion';

export default async function JalurList({
  items,
  locale = 'id',
  tingkatJudul,
  urlPendaftaran,
}: {
  items: JalurSeleksiDoc[];
  locale?: string;
  urlPendaftaran?: string;
  tingkatJudul?: 'h2' | 'h3';
}) {
  const t = await getTranslations('jalurPage');

  if (!items.length) {
    return (
      <Card>
        <p className="text-ink-muted">{t('empty')}</p>
      </Card>
    );
  }

  const localizedItems: JalurAccordionItem[] = items.map((raw, index) => {
    const nama = locale === 'en' ? ((raw as any).nama_en || raw.nama) : raw.nama;
    const ringkasan = locale === 'en' ? ((raw as any).ringkasan_en || raw.ringkasan) : raw.ringkasan;
    const deskripsiRaw = locale === 'en' ? ((raw as any).deskripsi_en || raw.deskripsi) : raw.deskripsi;

    return {
      id: String(raw._id),
      slug: raw.slug,
      index,
      nama,
      ringkasan: ringkasan || undefined,
      deskripsiHtml: deskripsiRaw ? sanitizeRichText(deskripsiRaw) : undefined,
      persyaratan: raw.persyaratan ?? [],
      badge: raw.badge || undefined,
    };
  });

  return <JalurAccordion items={localizedItems} tingkatJudul={tingkatJudul} urlPendaftaran={urlPendaftaran} />;
}
