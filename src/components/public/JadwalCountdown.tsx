'use client';

import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/id';

type CountdownState = {
  expired: boolean;
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
};

function getCountdownState(target: string): CountdownState {
  const now = dayjs();
  const end = dayjs(target).endOf('day');

  if (now.isAfter(end)) {
    return {
      expired: true,
      days: '00',
      hours: '00',
      minutes: '00',
      seconds: '00',
    };
  }

  const totalSeconds = Math.max(0, end.diff(now, 'second'));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    expired: false,
    days: String(days).padStart(2, '0'),
    hours: String(hours).padStart(2, '0'),
    minutes: String(minutes).padStart(2, '0'),
    seconds: String(seconds).padStart(2, '0'),
  };
}

const PLACEHOLDER_STATE: CountdownState = {
  expired: false,
  days: '--',
  hours: '--',
  minutes: '--',
  seconds: '--',
};

export default function JadwalCountdown({
  target,
  locale = 'id',
  variant = 'closing',
}: {
  target: string;
  locale?: string;
  variant?: 'closing' | 'opening';
}) {
  const [value, setValue] = useState<CountdownState>(PLACEHOLDER_STATE);
  const [mounted, setMounted] = useState(false);
  const isEnglish = locale === 'en';
  const targetDate = dayjs(target).locale(isEnglish ? 'en' : 'id').format('DD MMM YYYY, HH:mm');
  const isOpening = variant === 'opening';

  useEffect(() => {
    setMounted(true);
    setValue(getCountdownState(target));

    const timer = window.setInterval(() => {
      setValue(getCountdownState(target));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [target]);

  const segments = [
    { key: 'days', label: isEnglish ? 'Days' : 'Hari', value: value.days },
    { key: 'hours', label: isEnglish ? 'Hours' : 'Jam', value: value.hours },
    { key: 'minutes', label: isEnglish ? 'Minutes' : 'Menit', value: value.minutes },
    { key: 'seconds', label: isEnglish ? 'Seconds' : 'Detik', value: value.seconds },
  ];

  return (
    <div
      className={
        isOpening
          ? 'rounded-[1.75rem] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(226,232,240,0.78),rgba(255,255,255,0.98)_45%,rgba(241,245,249,0.92))] p-4 shadow-[0_18px_50px_-30px_rgba(100,116,139,0.26)]'
          : 'rounded-[1.75rem] border border-brand-200/80 bg-[linear-gradient(135deg,rgba(14,165,233,0.12),rgba(255,255,255,0.98)_45%,rgba(249,115,22,0.12))] p-4 shadow-[0_18px_50px_-30px_rgba(14,165,233,0.45)]'
      }
      aria-live="polite"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={isOpening ? 'text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-700' : 'text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-700'}>
            {isOpening
              ? isEnglish
                ? 'Countdown to open'
                : 'Hitung mundur pembukaan'
              : isEnglish
                ? 'Countdown to close'
                : 'Hitung mundur penutupan'}
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            {value.expired
              ? isOpening
                ? isEnglish
                  ? 'This schedule is now open.'
                  : 'Jadwal ini sudah dibuka.'
                : isEnglish
                  ? 'This schedule has ended.'
                  : 'Jadwal ini sudah berakhir.'
              : isOpening
                ? isEnglish
                  ? 'Time remaining before this schedule opens.'
                  : 'Sisa waktu sebelum jadwal ini dibuka.'
                : isEnglish
                  ? 'Time remaining before this period closes.'
                  : 'Sisa waktu sebelum periode ini ditutup.'}
          </p>
        </div>
        <div
          className={
            value.expired
              ? isOpening
                ? 'inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700'
                : 'inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600'
              : isOpening
                ? 'inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700'
                : 'inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700'
          }
        >
          {value.expired
            ? isOpening
              ? isEnglish
                ? 'Opened'
                : 'Dibuka'
              : isEnglish
                ? 'Ended'
                : 'Berakhir'
            : isOpening
              ? 'Soon'
              : isEnglish
                ? 'Active'
                : 'Aktif'}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {segments.map((segment) => (
          <div
            key={segment.key}
            className="rounded-2xl border border-white/80 bg-white/90 px-3 py-4 text-center shadow-sm"
          >
            <div className="font-display text-3xl font-extrabold leading-none text-ink">{segment.value}</div>
            <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              {segment.label}
            </div>
          </div>
        ))}
      </div>

      <div
        className={
          isOpening
            ? 'mt-4 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-ink-muted'
            : 'mt-4 rounded-2xl border border-brand-100 bg-white/80 px-4 py-3 text-sm text-ink-muted'
        }
      >
        <span className="font-semibold text-ink">
          {isOpening ? (isEnglish ? 'Opens on:' : 'Mulai pada:') : isEnglish ? 'Ends on:' : 'Berakhir pada:'}
        </span>{' '}
        {targetDate}
      </div>
    </div>
  );
}
