import dayjs from 'dayjs';
import 'dayjs/locale/id';
import 'dayjs/locale/en';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { ANALYTICS_EVENTS } from '@/lib/analytics';
import type { DokumenDoc } from '@/models/Dokumen';
import TrackedAnalyticsLink from './TrackedAnalyticsLink';

// Daftar dokumen resmi (FR-49, FR-51, FR-52): satu baris per dokumen (bukan kartu di dalam kartu)
// dengan judul, format, ukuran, tanggal diperbarui, badge "Baru" (G-8: diperbarui <=30 hari),
// serta tombol Lihat dan Unduh berukuran sentuh >=44px. Semua teks lewat i18n.

const HARI_BARU = 30;

function formatSize(bytes: number): string {
  if (!bytes) return '—';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function formatBerkas(mime: string | undefined): string {
  if (!mime || mime === 'application/pdf') return 'PDF';
  return (mime.split('/')[1] ?? 'FILE').toUpperCase();
}

export default async function DokumenList({
  items,
  locale = 'id',
  iconType = 'default',
}: {
  items: DokumenDoc[];
  locale?: string;
  iconType?: 'default' | 'biaya' | 'manual';
}) {
  const t = await getTranslations('common');
  const td = await getTranslations('dokumen');

  if (!items.length) {
    return (
      <div className="px-2 py-6 text-center">
        <p className="text-sm text-ink-muted">{td('kosong')}</p>
        <Link
          href="/kontak"
          className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl border border-brand-200 px-5 text-sm font-semibold text-brand-700 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20"
        >
          {td('kosongKontak')}
        </Link>
      </div>
    );
  }

  const sekarang = Date.now();
  return (
    <ul className="divide-y divide-brand-100">
      {items.map((d) => {
        const judul = locale === 'en' ? ((d as any).judul_en || d.judul) : d.judul;
        const diperbarui = (d as any).updatedAt as Date | string | undefined;
        const baru = diperbarui ? sekarang - new Date(diperbarui).getTime() <= HARI_BARU * 86_400_000 : false;
        const tanggal = diperbarui ? dayjs(diperbarui).locale(locale === 'en' ? 'en' : 'id').format('D MMM YYYY') : '—';
        const id = String(d._id);
        return (
          <li key={id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-brand-50 text-brand-700" aria-hidden="true">
                {iconType === 'biaya' ? (
                  <i className="fa-duotone fa-solid fa-file-invoice-dollar text-xl leading-none" />
                ) : iconType === 'manual' ? (
                  <i className="fa-sharp-duotone fa-solid fa-book text-xl leading-none" />
                ) : (
                  <i className="fa-solid fa-file-lines text-xl leading-none" />
                )}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold leading-snug text-ink">{judul}</h3>
                  {baru && (
                    <span className="inline-flex items-center rounded-full bg-accent-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-ink">
                      {td('baru')}
                    </span>
                  )}
                </div>
                {d.deskripsi && <p className="mt-1 text-sm text-ink-muted line-clamp-2">{d.deskripsi}</p>}
                <p className="mt-1 text-xs text-ink-muted">
                  {td('meta', { format: formatBerkas(d.mime), ukuran: formatSize(d.ukuranByte), tanggal })}
                </p>
              </div>
            </div>
            <div className="flex flex-none gap-2">
              <a
                href={`/api/files/${id}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={td('lihatDokumen', { judul })}
                className="inline-flex min-h-11 min-w-11 flex-1 items-center justify-center rounded-full bg-brand-700 px-5 text-sm font-semibold text-white hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/25 sm:flex-none"
              >
                {t('lihat')}
              </a>
              <TrackedAnalyticsLink
                href={`/api/files/${id}?download=1`}
                eventName={ANALYTICS_EVENTS.documentDownload}
                eventParams={{ dokumen_id: id, dokumen_judul: judul }}
                aria-label={td('unduhDokumen', { judul })}
                className="inline-flex min-h-11 min-w-11 flex-1 items-center justify-center rounded-full border border-brand-200 px-5 text-sm font-semibold text-brand-700 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/25 sm:flex-none"
              >
                {t('unduh')}
              </TrackedAnalyticsLink>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
