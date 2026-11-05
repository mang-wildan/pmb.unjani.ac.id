import type { CSSProperties, ReactNode } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { getTranslations } from 'next-intl/server';
import { Badge, Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';
import type { JadwalDoc } from '@/models/Jadwal';
import JadwalCountdown from './JadwalCountdown';
import Reveal from './Reveal';

type JalurValue = string | { nama?: string | null } | null | undefined;

type JadwalLike = JadwalDoc & {
  judul: string;
  ke: number;
  tahun: string;
  status?: boolean;
  isSoon?: boolean;
  mulai: Date | string;
  selesai: Date | string;
  jalur?: JalurValue[];
};

function fmtDate(value: Date | string, locale: string) {
  return dayjs(value)
    .locale(locale === 'en' ? 'en' : 'id')
    .format('DD MMM YYYY');
}

function fmtMonth(value: Date | string, locale: string) {
  return dayjs(value)
    .locale(locale === 'en' ? 'en' : 'id')
    .format('MMM')
    .toUpperCase();
}

function getJalurNames(values: JalurValue[] = []) {
  return values
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object' && item.nama) return item.nama;
      return null;
    })
    .filter((value): value is string => Boolean(value));
}

function getPhaseKey(title: string) {
  const value = title.toLowerCase();
  if (value.includes('daftar')) return 'fasePendaftaran';
  if (value.includes('ujian') || value.includes('tes')) return 'faseUjian';
  if (value.includes('umum')) return 'fasePengumuman';
  if (value.includes('registr')) return 'faseRegistrasi';
  return 'faseLainnya';
}

function getState(
  mulai: Date | string,
  selesai: Date | string,
  t: Awaited<ReturnType<typeof getTranslations>>,
) {
  const now = dayjs();
  const start = dayjs(mulai).startOf('day');
  const end = dayjs(selesai).endOf('day');

  if (now.isBefore(start)) {
    const days = Math.max(0, start.diff(now.startOf('day'), 'day'));
    return {
      className: 'bg-slate-100 text-slate-700',
      label: t('mulaiDalam', { days }),
    };
  }

  if (now.isAfter(end)) {
    return {
      className: 'bg-gray-100 text-gray-600',
      label: t('sudahBerakhir'),
    };
  }

  const remainingDays = Math.max(0, end.endOf('day').diff(now.startOf('day'), 'day'));

  return {
    className:
      remainingDays <= 2 ? 'bg-accent-50 text-accent-700' : 'bg-emerald-50 text-emerald-700',
    label:
      remainingDays === 0
        ? t('berakhirHariIni')
        : remainingDays <= 2
          ? t('berakhirDalam', { days: remainingDays })
          : t('sedangBerlangsung'),
  };
}

// Progres masa pendaftaran gelombang yang sedang berjalan (FR-36): persen waktu yang sudah lewat
// dari awal hari `mulai` sampai akhir hari `selesai`. null bila belum dimulai atau sudah berakhir.
function getProgres(mulai: Date | string, selesai: Date | string) {
  const now = dayjs();
  const start = dayjs(mulai).startOf('day');
  const end = dayjs(selesai).endOf('day');
  if (now.isBefore(start) || now.isAfter(end)) return null;
  const persen = Math.min(100, Math.max(0, Math.round((now.diff(start) / end.diff(start)) * 100)));
  const hari = Math.max(0, end.diff(now.startOf('day'), 'day'));
  return { persen, hari };
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 3v3m8-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a1 1 0 0 1 1-1Z"
      />
    </svg>
  );
}

function RouteIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm14 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM7 8h5a3 3 0 0 1 3 3v2a3 3 0 0 0 3 3h1"
      />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
      <circle cx="12" cy="12" r="8" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v5l3 2" />
    </svg>
  );
}

function InfoTile({
  icon,
  label,
  value,
  muted = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className={cn('rounded-2xl bg-white/80 p-4', muted ? 'border border-slate-200' : 'border border-brand-100')}>
      <div
        className={cn(
          'flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]',
          muted ? 'text-slate-700' : 'text-brand-700',
        )}
      >
        <span className={muted ? 'text-slate-500' : 'text-brand-500'}>{icon}</span>
        <span>{label}</span>
      </div>
      <p className="mt-2 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

export default async function JadwalHighlights({
  items,
  locale = 'id',
}: {
  items: JadwalLike[];
  locale?: string;
}) {
  const t = await getTranslations('jadwalPage');
  const th = await getTranslations('home');
  const activeItems = items.filter((item) => item.status !== false);

  if (!activeItems.length) {
    return (
      <Card>
        <p className="text-ink-muted">{t('emptyCurrent')}</p>
      </Card>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {activeItems.map((item, indeks) => {
        const jalurNames = getJalurNames(item.jalur);
        const state = getState(item.mulai, item.selesai, t);
        const phaseKey = getPhaseKey(item.judul);
        const isSoon = item.isSoon === true;
        const progres = isSoon ? null : getProgres(item.mulai, item.selesai);
        const idProgres = `progres-${String(item._id)}`;

        return (
          <Reveal key={String(item._id)} urutan={indeks}>
            <Card
              className={cn(
                'relative h-full overflow-hidden p-0 hover:shadow-lg',
                isSoon
                  ? 'border-slate-200 bg-[linear-gradient(145deg,rgba(226,232,240,0.7),rgba(255,255,255,0.98)_42%,rgba(241,245,249,0.92))] hover:border-slate-300'
                  : 'border-brand-100 bg-[linear-gradient(145deg,rgba(14,165,233,0.10),rgba(255,255,255,0.98)_42%,rgba(249,115,22,0.10))] hover:border-brand-300',
              )}
            >
              <div
                className={cn(
                  'absolute inset-x-0 top-0 h-1',
                  isSoon
                    ? 'bg-gradient-to-r from-slate-300 via-slate-200 to-slate-400'
                    : 'bg-gradient-to-r from-brand via-brand-300 to-accent',
                )}
                aria-hidden
              />

              <div className="p-6 md:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={isSoon ? 'muted' : phaseKey === 'fasePendaftaran' ? 'accent' : 'brand'}>
                        {t(phaseKey)}
                      </Badge>
                      {isSoon && <Badge tone="accent">Soon</Badge>}
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
                          state.className,
                        )}
                      >
                        {state.label}
                      </span>
                    </div>

                    <h3 className="mt-4 font-display text-xl font-bold leading-tight text-ink">
                      {item.judul}
                    </h3>

                    <p className="mt-2 text-sm text-ink-muted">
                      {t('gelombang', { number: item.ke })} | {t('tahunAjaran')}: {item.tahun}
                    </p>
                  </div>

                  <div
                    className={cn(
                      'shrink-0 rounded-2xl bg-white/90 px-4 py-3 text-center shadow-sm',
                      isSoon ? 'border border-slate-200' : 'border border-brand-100',
                    )}
                  >
                    <p
                      className={cn(
                        'text-[11px] font-semibold uppercase tracking-[0.18em]',
                        isSoon ? 'text-slate-700' : 'text-brand-700',
                      )}
                    >
                      {fmtMonth(item.selesai, locale)}
                    </p>
                    <p className="mt-1 font-display text-3xl font-bold leading-none text-ink">
                      {dayjs(item.selesai).format('DD')}
                    </p>
                    <p className="mt-1 text-xs text-ink-soft">{dayjs(item.selesai).format('YYYY')}</p>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <InfoTile
                    icon={<CalendarIcon className="h-4 w-4" />}
                    label={t('mulai')}
                    value={fmtDate(item.mulai, locale)}
                    muted={isSoon}
                  />
                  <InfoTile
                    icon={<CalendarIcon className="h-4 w-4" />}
                    label={t('selesai')}
                    value={fmtDate(item.selesai, locale)}
                    muted={isSoon}
                  />
                </div>

                <div className="mt-5">
                  <JadwalCountdown
                    target={dayjs(isSoon ? item.mulai : item.selesai).toISOString()}
                    locale={locale}
                    variant={isSoon ? 'opening' : 'closing'}
                  />
                </div>

                {progres && (
                  <div className="mt-5">
                    <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">
                      <span id={idProgres}>{th('jadwalProgresLabel')}</span>
                      <span aria-hidden="true" className="tabular-nums">{progres.persen}%</span>
                    </div>
                    <div
                      role="progressbar"
                      aria-labelledby={idProgres}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={progres.persen}
                      aria-valuetext={th('jadwalProgres', { persen: progres.persen, hari: progres.hari })}
                      className="mt-2 h-2 overflow-hidden rounded-full bg-brand-50"
                    >
                      <div
                        className="bar-progres h-full rounded-full bg-gradient-to-r from-brand to-accent"
                        style={{ '--progres': progres.persen / 100 } as CSSProperties}
                      />
                    </div>
                  </div>
                )}

                <div className="mt-5">
                  <div
                    className={cn(
                      'flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]',
                      isSoon ? 'text-slate-700' : 'text-brand-700',
                    )}
                  >
                    <RouteIcon className="h-4 w-4" />
                    <span>{t('jalurTersedia')}</span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {jalurNames.length > 0 ? (
                      jalurNames.map((name) => (
                        <span
                          key={name}
                          className={cn(
                            'inline-flex rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-ink-muted',
                            isSoon ? 'border border-slate-200' : 'border border-brand-100',
                          )}
                        >
                          {name}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-ink-soft">{t('jalurKosong')}</span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </Reveal>
        );
      })}
    </div>
  );
}
