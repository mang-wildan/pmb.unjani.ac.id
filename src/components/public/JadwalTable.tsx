import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { getTranslations } from 'next-intl/server';
import type { JadwalDoc } from '@/models/Jadwal';

function fmt(d: Date | string, locale: string) {
  return dayjs(d)
    .locale(locale === 'en' ? 'en' : 'id')
    .format('DD MMM YYYY');
}

export default async function JadwalTable({
  items,
  locale = 'id',
}: {
  items: JadwalDoc[];
  locale?: string;
}) {
  const t = await getTranslations('jadwalPage');

  if (!items.length) {
    return (
      <div className="rounded-3xl border border-dashed border-brand-200 bg-white p-8 text-center text-ink-muted">
        {t('empty')}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-soft">
      <table className="w-full text-sm">
        <thead className="bg-brand-50/70 text-ink">
          <tr>
            <th className="px-5 py-3 text-left font-semibold">{t('kegiatan')}</th>
            <th className="px-5 py-3 text-left font-semibold">{t('jalur') ?? 'Jalur'}</th>
            <th className="px-5 py-3 text-left font-semibold">{t('mulai')}</th>
            <th className="px-5 py-3 text-left font-semibold">{t('selesai')}</th>
            <th className="px-5 py-3 text-left font-semibold">{t('status') ?? 'Status'}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-brand-50">
          {items.map((j) => {
            const jalurList = Array.isArray((j as any).jalur) ? (j as any).jalur : [];
            const jalurNames: string[] = jalurList.map((x: any) =>
              typeof x === 'object' && x !== null ? x.nama : String(x),
            );
            const isActive = (j as any).status !== false;

            return (
              <tr key={String(j._id)} className="hover:bg-brand-50/40">
                <td className="px-5 py-3 text-ink">
                  <div className="font-medium">{j.judul}</div>
                </td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap gap-1">
                    {jalurNames.length > 0 ? (
                      jalurNames.map((n, i) => (
                        <span
                          key={i}
                          className="inline-flex rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700"
                        >
                          {n}
                        </span>
                      ))
                    ) : (
                      <span className="text-ink-muted/40 text-xs">—</span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3 text-ink-muted whitespace-nowrap">
                  {fmt((j as any).mulai as Date, locale)}
                </td>
                <td className="px-5 py-3 text-ink-muted whitespace-nowrap">
                  {fmt((j as any).selesai as Date, locale)}
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      isActive ? 'bg-brand-50 text-brand-700' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {isActive ? (t('statusAktif') ?? 'Aktif') : (t('statusNonaktif') ?? 'Nonaktif')}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
