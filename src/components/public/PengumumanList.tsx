import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Badge, Card } from '@/components/ui/Card';
import type { PengumumanDoc } from '@/models/Pengumuman';

export default async function PengumumanList({
  items,
  locale = 'id',
}: {
  items: PengumumanDoc[];
  locale?: string;
}) {
  const t = await getTranslations('pengumumanPage');

  if (!items.length) {
    return (
      <Card>
        <p className="text-ink-muted">{t('empty')}</p>
      </Card>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {items.map((p) => {
        const judul = locale === 'en' ? ((p as any).judul_en || p.judul) : p.judul;
        const ringkasan = locale === 'en' ? ((p as any).ringkasan_en || p.ringkasan) : p.ringkasan;
        return (
          <Card key={String(p._id)} className="flex flex-col">
            <div className="flex items-center gap-2">
              {p.pinned && <Badge tone="accent">{t('penting')}</Badge>}
              <time
                className="text-xs text-ink-soft"
                dateTime={new Date(p.publishedAt as Date).toISOString()}
              >
                {dayjs(p.publishedAt as Date)
                  .locale(locale === 'en' ? 'en' : 'id')
                  .format('DD MMM YYYY')}
              </time>
            </div>
            <h3 className="mt-2 font-display text-lg font-bold text-ink leading-tight">
              <Link href={`/pengumuman/${p.slug}`} className="hover:text-brand-700">
                {judul}
              </Link>
            </h3>
            {ringkasan && (
              <p className="mt-2 text-sm text-ink-muted line-clamp-3">{ringkasan}</p>
            )}
            <div className="mt-auto pt-4">
              <Link
                href={`/pengumuman/${p.slug}`}
                className="text-sm font-semibold text-brand-700 hover:text-brand-600"
              >
                {t('bacaSelengkapnya')}
              </Link>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
