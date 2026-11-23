import type { CSSProperties } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { JadwalDoc } from '@/models/Jadwal';
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

// J24 · Papan Status Dua Kolom: "Sedang berlangsung" (kiri) dan "Akan datang" (kanan).
// Data mengikuti jadwal yang lolos saringan beranda: periode yang berjalan + satu periode terdekat.

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
    return t('mulaiDalam', { days });
  }

  if (now.isAfter(end)) return t('sudahBerakhir');

  const remainingDays = Math.max(0, end.diff(now.startOf('day'), 'day'));
  if (remainingDays === 0) return t('berakhirHariIni');
  if (remainingDays <= 2) return t('berakhirDalam', { days: remainingDays });
  return t('sedangBerlangsung');
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

function DateBlock({ value, locale }: { value: Date | string; locale: string }) {
  return (
    <div className="w-20 shrink-0 rounded-lg border border-ln bg-ff px-2 py-2 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-accent-800">
        {fmtMonth(value, locale)}
      </p>
      <p className="font-display text-2xl font-bold leading-tight text-ink">
        {dayjs(value).format('DD')}
      </p>
      <p className="text-[10px] text-ink-muted">{dayjs(value).format('YYYY')}</p>
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
  const aktifItems = items.filter((item) => item.status !== false);
  const berjalan = aktifItems.filter((item) => item.isSoon !== true);
  const akanDatang = aktifItems.filter((item) => item.isSoon === true);

  if (!aktifItems.length) {
    return (
      <p className="rounded-lg border border-ln bg-ff p-6 text-ink-muted">{t('emptyCurrent')}</p>
    );
  }

  return (
    <div>
      <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <section
          aria-labelledby="jadwal-berlangsung"
          className="rounded-lg border border-ln bg-ff p-5 md:p-7"
        >
          <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h3 id="jadwal-berlangsung" className="font-display text-lg font-bold text-ink">
              {t('sedangBerlangsung')}
            </h3>
            <p className="text-xs font-semibold text-ink-muted">
              {t('jumlahPeriode', { count: berjalan.length })}
            </p>
          </header>

          {berjalan.length > 0 ? (
            <ul className="mt-5 grid gap-4">
              {berjalan.map((item, indeks) => {
                const jalurNames = getJalurNames(item.jalur);
                const progres = getProgres(item.mulai, item.selesai);
                const sisa = progres
                  ? t('sisaHari', { days: progres.hari })
                  : getState(item.mulai, item.selesai, t);
                const idProgres = `progres-${String(item._id)}`;

                return (
                  <Reveal key={String(item._id)} as="li" urutan={indeks}>
                    <article className="rounded-lg bg-bg p-4 md:p-5">
                      <div className="flex flex-wrap items-start gap-4">
                        <DateBlock value={item.selesai} locale={locale} />

                        <div className="min-w-0 flex-1 basis-56">
                          <h4 className="font-display text-lg font-bold leading-snug text-ink">
                            {item.judul}
                          </h4>
                          <p className="mt-1 text-xs text-ink-muted">
                            {t('gelombang', { number: item.ke })} · {item.tahun}
                          </p>
                          <p className="mt-2 text-sm font-semibold text-brand">{sisa}</p>

                          {progres && (
                            <div className="mt-2">
                              <p className="text-[11px] font-semibold text-ink-muted">
                                <span id={idProgres}>{th('jadwalProgresLabel')}</span>{' '}
                                <span className="tabular-nums text-ink">{progres.persen}%</span>
                              </p>
                              <div
                                role="progressbar"
                                aria-labelledby={idProgres}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={progres.persen}
                                aria-valuetext={th('jadwalProgres', { persen: progres.persen, hari: progres.hari })}
                                className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ln"
                              >
                                <div
                                  className="bar-progres h-full rounded-full bg-brand"
                                  style={{ '--progres': progres.persen / 100 } as CSSProperties}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto sm:flex-col sm:items-end">
                          {jalurNames.length > 0 && (
                            <ul className="flex flex-wrap gap-2">
                              {jalurNames.map((name) => (
                                <li
                                  key={name}
                                  className="inline-flex rounded-full border border-accent-800/40 bg-accent-50 px-2.5 py-1 text-[11px] font-semibold text-accent-900"
                                >
                                  {name}
                                </li>
                              ))}
                            </ul>
                          )}
                          <Link
                            href="/jadwal-pmb"
                            className="inline-flex min-h-11 items-center text-sm font-semibold text-brand hover:text-brand-700"
                          >
                            {t('lihatDetail')}
                          </Link>
                        </div>
                      </div>
                    </article>
                  </Reveal>
                );
              })}
            </ul>
          ) : (
            <p className="mt-5 text-sm text-ink-muted">{t('emptyCurrent')}</p>
          )}
        </section>

        <section
          aria-labelledby="jadwal-akan-datang"
          className="flex flex-col rounded-lg bg-alt p-5 md:p-7"
        >
          <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h3 id="jadwal-akan-datang" className="font-display text-lg font-bold text-ink">
              {t('akanDatang')}
            </h3>
            <p className="text-xs font-semibold text-ink-muted">
              {t('jumlahPeriode', { count: akanDatang.length })}
            </p>
          </header>

          {akanDatang.length > 0 ? (
            <ul className="mt-5 grid gap-4">
              {akanDatang.map((item, indeks) => {
                const jalurNames = getJalurNames(item.jalur);

                return (
                  <Reveal key={String(item._id)} as="li" urutan={indeks}>
                    <article className="rounded-lg bg-ff p-4">
                      <div className="flex flex-wrap items-start gap-3">
                        <DateBlock value={item.mulai} locale={locale} />
                        <div className="min-w-0 flex-1 basis-40">
                          <h4 className="font-display text-base font-bold leading-snug text-ink">
                            {item.judul}
                          </h4>
                          <p className="mt-1 text-xs text-ink-muted">
                            {t('gelombang', { number: item.ke })} · {item.tahun}
                          </p>
                          <p className="mt-2 text-sm font-semibold text-brand">
                            {getState(item.mulai, item.selesai, t)}
                          </p>
                          <p className="mt-1 text-xs text-ink-muted">
                            {fmtDate(item.mulai, locale)} - {fmtDate(item.selesai, locale)}
                          </p>
                          {jalurNames.length > 0 && (
                            <ul className="mt-2 flex flex-wrap gap-2">
                              {jalurNames.map((name) => (
                                <li
                                  key={name}
                                  className="inline-flex rounded-full border border-accent-800/40 bg-accent-50 px-2.5 py-1 text-[11px] font-semibold text-accent-900"
                                >
                                  {name}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </article>
                  </Reveal>
                );
              })}
            </ul>
          ) : (
            <div className="mt-5 flex flex-1 flex-col items-center justify-center rounded-lg bg-ff p-6 text-center">
              <p className="font-display text-base font-bold text-ink">{t('kosongAkanDatang')}</p>
              <p className="mt-2 max-w-xs text-sm text-ink-muted">{t('kosongAkanDatangDesc')}</p>
              <Link
                href="/jadwal-pmb"
                className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-brand px-4 text-sm font-semibold text-brand hover:bg-brand-50"
              >
                {t('lihatJadwal')}
              </Link>
            </div>
          )}
        </section>
      </div>

      <Link
        href="/jadwal-pmb"
        className="mt-6 inline-flex min-h-11 items-center text-sm font-semibold text-brand hover:text-brand-700"
      >
        {th('jadwalLink')}
      </Link>
    </div>
  );
}
