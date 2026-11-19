'use client';

import { useState, useEffect, useRef, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Card, Badge } from '@/components/ui/Card';
import SearchableSelect, { type SearchableSelectOption } from '@/components/ui/SearchableSelect';
import { ANALYTICS_EVENTS, sendAnalyticsEvent } from '@/lib/analytics';
import { Link } from '@/i18n/navigation';
import { EVENT_PILIH_PRODI, type PilihProdiDetail } from '@/lib/pilihProdi';
import TrackedAnalyticsLink from './TrackedAnalyticsLink';

// ── Types ────────────────────────────────────────────────────────────────────

export type BiayaRecord = {
  _id: string;
  prodi_id: string;
  jalur_id: string;
  jalur_nama: string;
  kelas_id: string | null;
  jadwal_id: string;
  biaya: number;
  biayaPerSemester: number | null;
  biayaTambahan: number | null;
  persentase: string[];
};

export type KelasOpt = { _id: string; nama: string; singkatan: string };
export type JadwalOpt = { _id: string; judul: string; tahun: string; ke: number };
export type ProdiInfo = {
  id: string;
  nama: string;
  singkatan: string;
  jenjang: string;
  akreditasi: string;
  hasAkreditasiFile: boolean;
  fakultas_nama: string;
};

// Teks dan tautan keadaan kosong publik (FR-54). Diisi dari i18n dan Pengaturan oleh halaman
// pemanggil; komponen ini tidak menyebut panel admin.
export type KalkulatorKosong = {
  judul: string;
  pesan: string;
  labelWhatsApp: string;
  labelKontak: string;
  urlWhatsApp: string | null;
};

type Props = {
  records: BiayaRecord[];
  prodiOptions: SearchableSelectOption[];
  prodiMap?: Record<string, ProdiInfo>;
  kelasMap: Record<string, KelasOpt>;
  jadwalMap: Record<string, JadwalOpt>;
  kosong: KalkulatorKosong;
};

type StepStatus = 'completed' | 'active' | 'pending' | 'skipped';

// ── Helpers ──────────────────────────────────────────────────────────────────

function parsePct(s: string): number {
  return parseInt(s, 10) / 100;
}


function fmtRupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n);
}

function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

// ── Count-up hook ────────────────────────────────────────────────────────────

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Animates a numeric value from previous to target over `duration` ms (easeOutQuart). */
function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setValue(target);
      prevRef.current = target;
      return;
    }
    const from = prevRef.current;
    if (from === target) return;

    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 4); // easeOutQuart
      const cur = Math.round(from + (target - from) * eased);
      setValue(cur);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        prevRef.current = target;
        setValue(target);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

function AnimatedRupiah({
  value,
  duration,
  className = '',
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  const display = useCountUp(value, duration);
  return <span className={`tabular-nums ${className}`}>{fmtRupiah(display)}</span>;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function KalkulatorForm({ records, prodiOptions, prodiMap = {}, kelasMap, jadwalMap, kosong }: Props) {
  const t = useTranslations('kalkulatorPage');
  const [prodiId, setProdiId] = useState('');
  const [kelasId, setKelasId] = useState('');
  const [jadwalId, setJadwalId] = useState('');
  const [persentase, setPersentase] = useState('');
  const [btMultiplier, setBtMultiplier] = useState<Record<string, number>>({});

  const prodiRecords = prodiId ? records.filter((r) => r.prodi_id === prodiId) : [];

  const hasKelas = prodiRecords.some((r) => r.kelas_id !== null);
  const kelasOptions: KelasOpt[] = hasKelas
    ? unique(prodiRecords.map((r) => r.kelas_id).filter(Boolean) as string[])
        .map((id) => kelasMap[id])
        .filter(Boolean)
        .sort((a, b) => a.nama.localeCompare(b.nama))
    : [];

  const kelasFiltered = !hasKelas
    ? prodiRecords
    : kelasId
      ? prodiRecords.filter((r) => r.kelas_id === kelasId)
      : [];

  const hasJadwal = kelasFiltered.length > 0;
  const jadwalOptions: JadwalOpt[] = unique(kelasFiltered.map((r) => r.jadwal_id))
    .map((id) => jadwalMap[id])
    .filter(Boolean)
    .sort((a, b) => b.tahun.localeCompare(a.tahun) || a.judul.localeCompare(b.judul));

  const jadwalFiltered = jadwalId
    ? kelasFiltered.filter((r) => r.jadwal_id === jadwalId)
    : [];

  const persentaseOpts = unique(jadwalFiltered.flatMap((r) => r.persentase)).sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10),
  );

  const showResults = persentase !== '' && jadwalFiltered.length > 0;

  const kelasReady = !hasKelas || kelasId !== '';
  const jadwalReady = jadwalId !== '';
  const showPersentase = kelasReady && jadwalReady && jadwalFiltered.length > 0 && persentaseOpts.length > 0;

  function resetAll() {
    setProdiId('');
    setKelasId('');
    setJadwalId('');
    setPersentase('');
    setBtMultiplier({});
  }

  // FR-46: kartu program studi mengirim event window; pilih prodi itu seperti pemilihan manual
  // (reset langkah berikutnya). ID yang tidak ada di pilihan kalkulator diabaikan.
  useEffect(() => {
    const saatPilih = (e: Event) => {
      const id = (e as CustomEvent<PilihProdiDetail>).detail?.prodiId;
      if (!id || !prodiOptions.some((o) => o.value === id)) return;
      setProdiId(id);
      setKelasId('');
      setJadwalId('');
      setPersentase('');
      setBtMultiplier({});
    };
    window.addEventListener(EVENT_PILIH_PRODI, saatPilih);
    return () => window.removeEventListener(EVENT_PILIH_PRODI, saatPilih);
  }, [prodiOptions]);

  if (records.length === 0) {
    return <EmptyState kosong={kosong} />;
  }

  // Step status untuk progress indicator
  const stepStatuses: StepStatus[] = [
    prodiId ? 'completed' : 'active',
    !prodiId ? 'pending' : !hasKelas ? 'skipped' : kelasId ? 'completed' : 'active',
    !kelasReady ? 'pending' : jadwalId ? 'completed' : 'active',
    !jadwalReady ? 'pending' : persentase ? 'completed' : 'active',
  ];

  return (
    <div className="relative rounded-lg bg-[#063F2A] [&_article]:!rounded-lg">
      <BackgroundDecor />

      <div className="relative z-10 grid gap-6 lg:gap-8 lg:grid-cols-12 items-start">
        {/* ─── LEFT COLUMN: Form ──────────────────────────────────────── */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24 z-10">
          {/* Progress stepper */}
          <ProgressStepper statuses={stepStatuses} />

          {/* Form Card */}
          <div className="rounded-lg border border-brand-100 bg-white/90 backdrop-blur shadow-soft p-6 md:p-7">
            {/* Card header: title + reset */}
            <div className="flex items-center justify-between gap-3 mb-5 pb-4 border-b border-brand-50">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-brand-100 to-brand-50 text-brand-700">
                  <SparkleIcon className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-display font-bold text-ink text-base leading-none">
                    {t('kriteriaJudul')}
                  </h3>
                  <p className="text-[11px] text-ink-muted mt-0.5">
                    {t('kriteriaSub')}
                  </p>
                </div>
              </div>
              {prodiId && (
                <button
                  type="button"
                  onClick={resetAll}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50 transition-colors duration-200 motion-safe:animate-fade-in cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand/30"
                  aria-label={t('resetPilihan')}
                >
                  <RefreshIcon className="w-3.5 h-3.5" />
                  {t('reset')}
                </button>
              )}
            </div>

            <div className="space-y-4">
              {/* Program Studi */}
              <div className="relative z-40 motion-safe:animate-fade-up">
                <FieldWithIcon label={t('programStudi')} icon={<BookIcon />} stepNo={1}>
                  <SearchableSelect
                    options={prodiOptions}
                    value={prodiId}
                    placeholder={t('cariProdi')}
                    onChange={(v) => {
                      setProdiId(v);
                      setKelasId('');
                      setJadwalId('');
                      setPersentase('');
                      setBtMultiplier({});
                    }}
                  />
                </FieldWithIcon>
              </div>

              {/* Kelas — hanya muncul jika ada record berkelas */}
              {prodiId && hasKelas && (
                <div key={`kelas-${prodiId}`} className="motion-safe:animate-fade-up">
                  <FieldWithIcon label={t('kelas')} icon={<CapIcon />} stepNo={2}>
                    <SearchableSelect
                      searchable={false}
                      options={kelasOptions.map((k) => ({
                        value: k._id,
                        label: `${k.singkatan} — ${k.nama}`,
                      }))}
                      value={kelasId}
                      placeholder={t('pilihKelas')}
                      onChange={(v) => {
                        setKelasId(v);
                        setJadwalId('');
                        setPersentase('');
                        setBtMultiplier({});
                      }}
                    />
                  </FieldWithIcon>
                </div>
              )}

              {/* Jadwal */}
              {prodiId && kelasReady && hasJadwal && (
                <div key={`jadwal-${prodiId}-${kelasId}`} className="motion-safe:animate-fade-up">
                  <FieldWithIcon label={t('gelombang')} icon={<CalendarIcon />} stepNo={3}>
                    <SearchableSelect
                      searchable={false}
                      options={jadwalOptions.map((j) => ({
                        value: j._id,
                        label: j.judul,
                        sublabel: j.tahun,
                      }))}
                      value={jadwalId}
                      placeholder={t('pilihGelombang')}
                      onChange={(v) => {
                        setJadwalId(v);
                        setPersentase('');
                        setBtMultiplier({});
                      }}
                    />
                  </FieldWithIcon>
                </div>
              )}

              {/* Persentase */}
              {prodiId && showPersentase && (
                <div key={`pct-${jadwalId}`} className="motion-safe:animate-fade-up">
                  <FieldWithIcon
                    label={t('cicilan')}
                    hint={t('cicilanHint')}
                    icon={<CardIcon />}
                    stepNo={4}
                  >
                    <SearchableSelect
                      searchable={false}
                      options={persentaseOpts.map((p) => ({ value: p, label: p }))}
                      value={persentase}
                      placeholder={t('pilihPersentase')}
                      onChange={(v) => {
                        if (v) {
                          sendAnalyticsEvent(ANALYTICS_EVENTS.calculatorSubmit, {
                            prodi_id: prodiId,
                            jadwal_id: jadwalId,
                            persentase: v,
                          });
                        }
                        setPersentase(v);
                        setBtMultiplier({});
                      }}
                    />
                  </FieldWithIcon>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── RIGHT COLUMN: Results ──────────────────────────────────── */}
        <div className="lg:col-span-7">
          {!showResults && <ResultPlaceholder statuses={stepStatuses} />}

          {showResults && (
            <div key={`results-${jadwalId}-${persentase}`} className="motion-safe:animate-fade-up">
              <header className="mb-5 flex items-end justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-accent">
                    {t('estimasiBiaya')}
                  </p>
                  <h3 className="mt-1 font-display text-2xl font-bold text-white leading-tight">
                    {t('hasilPerJalur')}
                  </h3>
                  <span className="mt-2 inline-block w-12 h-1 rounded-lg bg-gradient-to-r from-brand to-accent" />
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 border border-brand-100 px-3 py-1.5 text-xs font-semibold text-brand-700">
                  <SparkleIcon className="w-3.5 h-3.5" />
                  {t('jalurCount', { n: jadwalFiltered.length })}
                </span>
              </header>

                  <div className="grid gap-4 sm:grid-cols-2">
                {jadwalFiltered.map((record, idx) => {
                  const minMult = jadwalMap[record.jadwal_id]?.ke ?? 1;
                  const mult = btMultiplier[record._id] ?? minMult;
                  const hasTambahan = record.biayaTambahan != null && record.biayaTambahan > 0;
                  const tambahan = hasTambahan ? mult * record.biayaTambahan! : 0;
                  const applied = Math.round((record.biaya + tambahan) * parsePct(persentase));

                  return (
                    <div
                      key={record._id}
                      className="motion-safe:animate-fade-up"
                      style={{ animationDelay: `${idx * 80}ms` }}
                    >
                      <Card className="kartu-angkat flex flex-col gap-0 h-full hover:border-brand-300">
                        <div className="flex items-center justify-between gap-2">
                          <Badge tone="brand" className="self-start">
                            {record.jalur_nama}
                          </Badge>
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-brand-50 text-brand-700">
                            <TagIcon className="w-4 h-4" />
                          </span>
                        </div>

                        {/* Prodi & Fakultas Info */}
                        {prodiMap[record.prodi_id] && (() => {
                          const p = prodiMap[record.prodi_id];
                          return (
                            <div className="mt-3 rounded-lg bg-gradient-to-br from-brand-50/80 to-white border border-brand-100 px-3.5 py-3 space-y-2">
                              {p.fakultas_nama && (
                                <p className="text-[10px] font-bold uppercase tracking-widest text-ink-soft flex items-center gap-1.5">
                                  <UniversityIcon className="w-3 h-3 flex-none" />
                                  {p.fakultas_nama}
                                </p>
                              )}
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-bold text-ink leading-snug">{p.nama}</p>
                                <span className="inline-flex flex-none items-center rounded-lg bg-brand px-2.5 py-0.5 text-[10px] font-bold text-white">
                                  {p.jenjang}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-2 pt-0.5 border-t border-brand-100">
                                <div className="flex items-center gap-1.5">
                                  <AwardIcon className="w-3.5 h-3.5 text-brand-700 flex-none" />
                                  <span className="text-xs text-ink-muted">
                                    Akreditasi:{' '}
                                    <span className="font-bold text-ink">
                                      {p.akreditasi || '—'}
                                    </span>
                                  </span>
                                </div>
                                {p.hasAkreditasiFile && (
                                  <a
                                    href={`/api/program-studi/${p.id}/akreditasi`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 rounded-lg bg-white border border-brand-200 px-2.5 py-1 text-[10px] font-semibold text-brand-700 hover:bg-brand-50 transition-colors"
                                  >
                                    <DownloadIcon className="w-3 h-3" />
                                    SK PDF
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        <div className="mt-4 space-y-2.5 text-sm flex-1">
                          <div className="flex justify-between items-baseline">
                            <span className="text-ink-muted">{t('biayaPokok')}</span>
                            <AnimatedRupiah
                              value={record.biaya}
                              className="font-semibold text-ink"
                            />
                          </div>
                          <Row label={t('persentase')} value={persentase} muted />

                          {/* Biaya Dibayar — highlight panel */}
                          <div className="mt-3 rounded-lg bg-gradient-to-br from-brand-50 to-brand-50/40 border border-brand-100 px-3.5 py-2.5">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                                {t('biayaDibayar')}
                              </span>
                              <AnimatedRupiah
                                value={applied}
                                className="font-display font-bold text-brand-800"
                              />
                            </div>
                          </div>

                          {/* Estimasi Biaya per Semester */}
                          {record.biayaPerSemester != null && record.biayaPerSemester > 0 && (
                            <div className="flex justify-between items-baseline pt-1">
                              <span className="text-xs text-ink-muted">{t('estimasiBiayaSemester')}</span>
                              <AnimatedRupiah
                                value={record.biayaPerSemester}
                                className="text-xs font-semibold text-ink-muted"
                              />
                            </div>
                          )}

                          {/* Biaya tambahan — stepper panel */}
                          {hasTambahan && (
                            <div className="rounded-lg bg-accent-50/40 border border-accent-100 px-3.5 py-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold uppercase tracking-wide text-accent-700">
                                  {t('spt')}
                                </span>
                                <span className="text-[10px] font-medium text-ink-muted">
                                  <AnimatedRupiah value={record.biayaTambahan!} duration={700} />
                                  /unit
                                </span>
                              </div>

                              <Stepper
                                value={mult}
                                min={minMult}
                                onChange={(v) =>
                                  setBtMultiplier((prev) => ({ ...prev, [record._id]: v }))
                                }
                              />

                              <div className="mt-2.5 flex justify-between items-baseline">
                                <span className="text-[11px] text-ink-muted">
                                  {mult === minMult
                                    ? `Min. gelombang ke-${minMult}`
                                    : `${mult}× unit price`}
                                </span>
                                <AnimatedRupiah
                                  value={tambahan}
                                  duration={500}
                                  className="font-bold text-accent-700"
                                />
                              </div>
                            </div>
                          )}

                        </div>
                      </Card>
                    </div>
                  );
                })}
              </div>

              <p className="mt-5 text-xs text-white/80 text-center">
                * Estimasi resmi berdasarkan data panitia PMB. Angka final dapat berbeda sesuai
                kebijakan terbaru.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function FieldWithIcon({
  label,
  hint,
  icon,
  stepNo,
  children,
}: {
  label: string;
  hint?: string;
  icon: ReactNode;
  stepNo: number;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-brand-100 to-brand-50 text-brand-700">
          {icon}
        </span>
        <span className="text-sm font-semibold text-ink">{label}</span>
        <span className="ml-auto inline-flex items-center justify-center w-5 h-5 rounded-lg bg-brand-50 text-[10px] font-bold text-brand-700">
          {stepNo}
        </span>
      </span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-ink-muted">{hint}</span>}
    </label>
  );
}

function ResultPlaceholder({ statuses }: { statuses: StepStatus[] }) {
  const t = useTranslations('kalkulatorPage');
  const labels = [t('stepperProdi'), t('stepperKelas'), t('stepperJadwal'), t('stepperCicilan')];
  const activeIdx = statuses.findIndex((s) => s === 'active');
  const nextLabel = activeIdx >= 0 ? labels[activeIdx] : t('kriteriaJudul');

  return (
    <div className="motion-safe:animate-fade-in rounded-lg border-2 border-dashed border-brand-100 bg-white p-8 md:p-10 text-center min-h-[420px] flex flex-col items-center justify-center">
      <div className="relative mb-5">
        <div className="absolute inset-0 rounded-lg bg-brand-100/60 blur-2xl motion-safe:animate-pulse" />
        <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-lg bg-gradient-to-br from-brand-50 to-white border border-brand-100 text-brand-700 shadow-sm motion-safe:animate-float">
          <CalculatorIcon className="w-10 h-10" />
        </div>
      </div>
      <h3 className="font-display text-xl font-bold text-ink mb-2">
        {t('placeholderTitle')}
      </h3>
      <p className="text-sm text-ink-muted max-w-sm mx-auto">
        {t('placeholderDesc', { next: nextLabel })}
      </p>

      <div className="mt-6 grid grid-cols-4 gap-2 w-full max-w-xs">
        {statuses.map((s, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-lg transition-colors duration-300 ${
              s === 'completed' || s === 'skipped'
                ? 'bg-brand'
                : s === 'active'
                  ? 'bg-brand/40'
                  : 'bg-brand-100'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function Stepper({
  value,
  min,
  onChange,
}: {
  value: number;
  min: number;
  onChange: (v: number) => void;
}) {
  const t = useTranslations('kalkulatorPage');
  const canDec = value > min;
  return (
    <div className="inline-flex items-center gap-2 rounded-lg bg-white border border-accent-200 p-1 shadow-sm">
      <button
        type="button"
        onClick={() => canDec && onChange(value - 1)}
        disabled={!canDec}
        aria-label={t('kurangiUnit')}
        className={`w-9 h-9 inline-flex items-center justify-center rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent/40 ${
          canDec
            ? 'text-ink hover:bg-accent-50 active:bg-accent-100 cursor-pointer'
            : 'text-ink-soft/40 cursor-not-allowed'
        }`}
      >
        <MinusIcon className="w-4 h-4" />
      </button>
      <span
        key={value}
        className="min-w-[2.5rem] text-center font-display font-bold text-lg text-brand-700 tabular-nums motion-safe:animate-scale-in"
      >
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        aria-label={t('tambahUnit')}
        className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-ink hover:bg-accent-50 active:bg-accent-100 transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/40"
      >
        <PlusIcon className="w-4 h-4" />
      </button>
    </div>
  );
}

function ProgressStepper({ statuses }: { statuses: StepStatus[] }) {
  const t = useTranslations('kalkulatorPage');
  const steps: { label: string; icon: ReactNode }[] = [
    { label: t('stepperProdi'), icon: <BookIcon className="w-4 h-4" /> },
    { label: t('stepperKelas'), icon: <CapIcon className="w-4 h-4" /> },
    { label: t('stepperJadwal'), icon: <CalendarIcon className="w-4 h-4" /> },
    { label: t('stepperCicilan'), icon: <CardIcon className="w-4 h-4" /> },
  ];

  const completedCount = statuses.filter((s) => s === 'completed' || s === 'skipped').length;
  const firstActiveIdx = statuses.findIndex((s) => s === 'active');
  // Only the first active step renders as 'active'; subsequent ones render as 'pending'
  const displayStatuses = statuses.map((s, i) =>
    s === 'active' && i !== firstActiveIdx ? 'pending' : s
  );

  return (
    <div className="rounded-lg bg-white border border-brand-100/70 px-4 pt-4 pb-3 shadow-sm motion-safe:animate-fade-in sm:px-5">
      {/* Wrapper: connectors behind, ol in front */}
      <div className="relative">
        {/* Connector layer — absolute siblings of ol, guaranteed behind z-10 ol */}
        <div aria-hidden className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-[1.375rem] h-0.5 -translate-y-1/2 bg-brand-100" />
        {steps.map((_, i) => {
          if (i === 0) return null;
          const filled = statuses[i - 1] === 'completed' || statuses[i - 1] === 'skipped';
          return (
            <div
              key={i}
              aria-hidden
              className={`pointer-events-none absolute h-0.5 top-[1.375rem] -translate-y-1/2 transition-colors duration-500 ${filled ? 'bg-brand' : 'bg-transparent'}`}
              style={{ left: `${(i - 0.5) * 25}%`, width: '25%' }}
            />
          );
        })}

        {/* Circle + label grid — z-10 so it always paints above connector lines */}
        <ol className="relative z-10 grid grid-cols-4">
          {steps.map(({ label, icon }, i) => {
            const status = displayStatuses[i];
            return (
              <li key={i} className="min-w-0">
                <div className="flex flex-col items-center text-center gap-1.5">
                  <StepCircle status={status} number={i + 1} icon={icon} showIcon={i === firstActiveIdx} />
                  <span
                    className={`block text-[10px] font-semibold leading-tight tracking-wide sm:text-xs transition-colors duration-300 ${
                      status === 'active'
                        ? 'text-brand-700'
                        : status === 'completed'
                          ? 'text-ink'
                          : status === 'skipped'
                            ? 'text-ink-muted'
                            : 'text-ink-muted'
                    }`}
                  >
                    {label}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Step counter label */}
      <p className="mt-2 text-center text-[10px] text-ink-muted font-medium">
        {completedCount === 4
          ? t('semuaSelesai')
          : t('langkah', { n: Math.min(completedCount + 1, 4), total: 4 })}
      </p>
    </div>
  );
}

function StepCircle({ status, number, icon, showIcon = false }: { status: StepStatus; number: number; icon?: ReactNode; showIcon?: boolean }) {
  const base =
    'inline-flex items-center justify-center w-11 h-11 rounded-lg text-sm font-bold transition-all duration-300';
  if (status === 'completed') {
    return (
      <span className={`${base} bg-brand text-white shadow-md shadow-brand/30`}>
        <CheckIcon className="w-5 h-5" />
      </span>
    );
  }
  if (status === 'active') {
    return (
      <span className="relative inline-flex">
        <span className="absolute inset-0 rounded-lg bg-brand/20 motion-safe:animate-ping" />
        <span
          className={`relative ${base} bg-white text-brand-700 border-2 border-brand ring-4 ring-brand-100 shadow-md shadow-brand/20`}
        >
          {showIcon && icon ? icon : number}
        </span>
      </span>
    );
  }
  if (status === 'skipped') {
    return (
      <span className={`${base} bg-gray-100 text-ink-muted border border-gray-200`}>
        <span className="block w-4 h-0.5 bg-ink-muted/40 rounded-lg" />
      </span>
    );
  }
  return (
    <span className={`${base} bg-white text-ink-muted border-2 border-gray-200`}>
      <span className="text-xs">{number}</span>
    </span>
  );
}

function EmptyState({ kosong }: { kosong: KalkulatorKosong }) {
  return (
    <div className="rounded-lg border border-white/20 bg-[#063F2A] p-6 text-left text-white sm:p-10">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-brand-50 text-brand-700 mb-4 motion-safe:animate-float">
        <CalculatorIcon className="w-8 h-8" />
      </div>
      <h2 id="kalkulator-heading" className="mb-3 font-display text-3xl font-bold text-white">{kosong.judul}</h2>
      <p className="max-w-2xl text-sm leading-relaxed text-white/85">{kosong.pesan}</p>
      <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
        {kosong.urlWhatsApp && (
          <TrackedAnalyticsLink
            href={kosong.urlWhatsApp}
            eventName={ANALYTICS_EVENTS.whatsappClick}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-[#1D2114] hover:bg-accent-600 focus-visible:ring-4 focus-visible:ring-white"
          >
            <i className="fa-brands fa-whatsapp text-lg leading-none" aria-hidden="true" />
            {kosong.labelWhatsApp}
          </TrackedAnalyticsLink>
        )}
        <Link
          href="/kontak"
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/60 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10 focus-visible:ring-4 focus-visible:ring-white"
        >
          {kosong.labelKontak}
        </Link>
      </div>
    </div>
  );
}

function BackgroundDecor() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden -z-10">
      <div className="absolute -top-24 -left-16 w-72 h-72 rounded-lg bg-brand-100/40 blur-3xl motion-safe:animate-blob-drift" />
      <div
        className="absolute -bottom-24 -right-16 w-80 h-80 rounded-lg bg-accent-100/30 blur-3xl motion-safe:animate-blob-drift"
        style={{ animationDelay: '4s' }}
      />
    </div>
  );
}

function Row({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-ink-muted">{label}</span>
      <span
        className={`tabular-nums ${muted ? 'text-ink-muted' : 'font-semibold text-ink'}`}
      >
        {value}
      </span>
    </div>
  );
}

// ── Icons (inline SVG, 24x24 viewBox) ────────────────────────────────────────

function BookIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function CapIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10 12 5 2 10l10 5 10-5z" />
      <path d="M6 12v5c0 1 3 3 6 3s6-2 6-3v-5" />
    </svg>
  );
}

function CalendarIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function CardIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  );
}

function CheckIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function PlusIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function MinusIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
    </svg>
  );
}

function RefreshIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}

function SparkleIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2 14 9 21 12 14 14 12 21 10 14 3 12 10 9z" />
    </svg>
  );
}

function TagIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <circle cx="7" cy="7" r="1.5" fill="currentColor" />
    </svg>
  );
}

function CalculatorIcon({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M8 6h8M8 10h2M12 10h2M16 10h0M8 14h2M12 14h2M16 14h0M8 18h2M12 18h6" />
    </svg>
  );
}

function UniversityIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" />
    </svg>
  );
}

function AwardIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  );
}

function DownloadIcon({ className = 'w-3 h-3' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
  );
}
