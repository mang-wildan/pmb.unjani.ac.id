'use client';

import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import PageHeader from '@/components/admin/PageHeader';
import TableLoadingRow from '@/components/admin/TableLoadingRow';
import { Field } from '@/components/admin/Field';
import ModalShell, { BtnCancel, ModalFooter } from '@/components/admin/ModalShell';
import SearchableSelect from '@/components/ui/SearchableSelect';

dayjs.locale('id');

type Period = 'all' | 'day' | 'week' | 'month' | 'year';
type ReportPeriod = Exclude<Period, 'all'>;

type LogItem = {
  _id: string;
  createdAt: string | null;
  email: string;
  aksi: string;
  entitas: string;
  entitasId: string;
  ringkasan: string;
  before: unknown;
  after: unknown;
  ip: string;
  userAgent: string;
};

type ListMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  period: Period;
  periodLabel: string;
  aksiOptions: string[];
  entitasOptions: string[];
};

type ReportCard = {
  key: ReportPeriod;
  label: string;
  count: number;
};

type BreakdownItem = {
  label: string;
  count: number;
};

type ReportPayload = {
  cards: ReportCard[];
  selectedPeriod: {
    key: ReportPeriod;
    label: string;
    start: string;
    end: string;
    total: number;
    uniqueUsers: number;
    latestActivityAt: string | null;
    metrics: {
      login: number;
      logout: number;
      create: number;
      update: number;
      delete: number;
      upload: number;
    };
    actions: BreakdownItem[];
    entities: BreakdownItem[];
  };
};

const PERIOD_OPTIONS = [
  { value: 'all', label: 'Semua Periode', dotColor: 'bg-gray-400' },
  { value: 'day', label: 'Hari Ini', dotColor: 'bg-emerald-500' },
  { value: 'week', label: 'Minggu Ini', dotColor: 'bg-sky-500' },
  { value: 'month', label: 'Bulan Ini', dotColor: 'bg-amber-500' },
  { value: 'year', label: 'Tahun Ini', dotColor: 'bg-brand' },
] as const;

const REPORT_PERIOD_OPTIONS = PERIOD_OPTIONS.filter((item) => item.value !== 'all');

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  return dayjs(value).format('DD MMM YYYY HH:mm');
}

function actionTone(action: string) {
  if (action === 'delete') return 'bg-red-50 text-red-700 border-red-200';
  if (action === 'update') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (action === 'login' || action === 'logout') return 'bg-sky-50 text-sky-700 border-sky-200';
  return 'bg-brand-50 text-brand-700 border-brand-200';
}

function StatCard({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <div className="rounded-2xl border border-brand-100 bg-white p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">{label}</p>
      <p className="mt-2 font-display text-3xl font-extrabold text-ink">{value}</p>
      <p className="mt-1.5 text-xs text-ink-muted">{hint}</p>
    </div>
  );
}

function BreakdownTable({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: BreakdownItem[];
  emptyText: string;
}) {
  return (
    <div className="rounded-2xl border border-brand-100 bg-white overflow-hidden">
      <div className="border-b border-brand-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-brand-50/70">
            <tr>
              <th className="px-4 py-2.5 text-left font-semibold">Item</th>
              <th className="px-4 py-2.5 text-right font-semibold">Jumlah</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-50">
            {items.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-ink-muted">
                  {emptyText}
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.label}>
                  <td className="px-4 py-3 text-ink">{item.label}</td>
                  <td className="px-4 py-3 text-right font-semibold text-ink">{item.count}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function JsonPreview({ value }: { value: unknown }) {
  if (value == null) {
    return <p className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-ink-muted">Tidak ada data.</p>;
  }

  return (
    <pre className="max-h-72 overflow-auto rounded-xl bg-slate-950 px-4 py-3 text-xs leading-relaxed text-slate-100">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export default function LogAktivitasAdminPage() {
  const [items, setItems] = useState<LogItem[]>([]);
  const [meta, setMeta] = useState<ListMeta>({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
    period: 'all',
    periodLabel: 'Semua Periode',
    aksiOptions: [],
    entitasOptions: [],
  });
  const [report, setReport] = useState<ReportPayload | null>(null);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [loadingReport, setLoadingReport] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAksi, setFilterAksi] = useState('');
  const [filterEntitas, setFilterEntitas] = useState('');
  const [logPeriod, setLogPeriod] = useState<Period>('all');
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('month');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<LogItem | null>(null);

  useEffect(() => {
    setPage(1);
  }, [search, filterAksi, filterEntitas, logPeriod]);

  useEffect(() => {
    let cancelled = false;

    async function loadLogs() {
      setLoadingLogs(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(meta.limit),
        period: logPeriod,
      });

      if (search.trim()) params.set('q', search.trim());
      if (filterAksi) params.set('aksi', filterAksi);
      if (filterEntitas) params.set('entitas', filterEntitas);

      const res = await fetch(`/api/admin/log-aktivitas?${params.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      if (cancelled) return;

      setItems(data.items || []);
      setMeta((prev) => ({
        ...prev,
        ...(data.meta || {}),
      }));
      setLoadingLogs(false);
    }

    loadLogs();
    return () => {
      cancelled = true;
    };
  }, [search, filterAksi, filterEntitas, logPeriod, page, meta.limit]);

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      setLoadingReport(true);
      const res = await fetch(`/api/admin/log-aktivitas/laporan?period=${reportPeriod}`, { cache: 'no-store' });
      const data = await res.json();
      if (cancelled) return;
      setReport(data);
      setLoadingReport(false);
    }

    loadReport();
    return () => {
      cancelled = true;
    };
  }, [reportPeriod]);

  const hasActiveFilters = Boolean(search.trim() || filterAksi || filterEntitas || logPeriod !== 'all');
  const reportMetrics = report?.selectedPeriod.metrics;

  return (
    <div>
      <PageHeader
        title="Log Aktivitas"
        description="Pantau audit aktivitas admin dan laporan ringkas per hari, minggu, bulan, atau tahun."
      />

      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink">Ringkasan Cepat</h2>
            <p className="text-sm text-ink-muted">Total aktivitas yang tercatat untuk periode utama.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {loadingReport ? (
            <>
              <StatCard label="Hari Ini" value="..." hint="Memuat data aktivitas" />
              <StatCard label="Minggu Ini" value="..." hint="Memuat data aktivitas" />
              <StatCard label="Bulan Ini" value="..." hint="Memuat data aktivitas" />
              <StatCard label="Tahun Ini" value="..." hint="Memuat data aktivitas" />
            </>
          ) : (
            report?.cards.map((card) => (
              <StatCard
                key={card.key}
                label={card.label}
                value={card.count}
                hint="Jumlah log aktivitas tercatat"
              />
            ))
          )}
        </div>
      </section>

      <section className="mb-6 rounded-2xl border border-brand-100 bg-white p-4">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink">Laporan Aktivitas</h2>
            <p className="text-sm text-ink-muted">Breakdown aktivitas untuk periode laporan yang dipilih.</p>
          </div>
          <div className="w-full sm:w-64">
            <Field label="Periode Laporan">
              <SearchableSelect
                searchable={false}
                rounded="full"
                value={reportPeriod}
                onChange={(value) => setReportPeriod(value as ReportPeriod)}
                options={REPORT_PERIOD_OPTIONS.map((item) => ({
                  value: item.value,
                  label: item.label,
                  dotColor: item.dotColor,
                }))}
              />
            </Field>
          </div>
        </div>

        {loadingReport || !report ? (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total Aktivitas" value="..." hint="Sedang memuat laporan" />
            <StatCard label="Admin Aktif" value="..." hint="Sedang memuat laporan" />
            <StatCard label="Login" value="..." hint="Sedang memuat laporan" />
            <StatCard label="Perubahan Data" value="..." hint="Sedang memuat laporan" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Total Aktivitas"
                value={report.selectedPeriod.total}
                hint={`${report.selectedPeriod.label} sampai ${formatDateTime(report.selectedPeriod.latestActivityAt)}`}
              />
              <StatCard
                label="Admin Aktif"
                value={report.selectedPeriod.uniqueUsers}
                hint="Jumlah email admin unik pada periode ini"
              />
              <StatCard
                label="Login"
                value={reportMetrics?.login ?? 0}
                hint={`${reportMetrics?.logout ?? 0} logout tercatat`}
              />
              <StatCard
                label="Perubahan Data"
                value={(reportMetrics?.create ?? 0) + (reportMetrics?.update ?? 0) + (reportMetrics?.delete ?? 0) + (reportMetrics?.upload ?? 0)}
                hint={`${reportMetrics?.create ?? 0} buat, ${reportMetrics?.update ?? 0} ubah, ${reportMetrics?.delete ?? 0} hapus`}
              />
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <div className="rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-700">
                <p className="font-semibold">Create</p>
                <p className="mt-1 text-2xl font-bold">{reportMetrics?.create ?? 0}</p>
              </div>
              <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
                <p className="font-semibold">Update</p>
                <p className="mt-1 text-2xl font-bold">{reportMetrics?.update ?? 0}</p>
              </div>
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                <p className="font-semibold">Delete</p>
                <p className="mt-1 text-2xl font-bold">{reportMetrics?.delete ?? 0}</p>
              </div>
              <div className="rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-700">
                <p className="font-semibold">Login</p>
                <p className="mt-1 text-2xl font-bold">{reportMetrics?.login ?? 0}</p>
              </div>
              <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                <p className="font-semibold">Logout</p>
                <p className="mt-1 text-2xl font-bold">{reportMetrics?.logout ?? 0}</p>
              </div>
              <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                <p className="font-semibold">Upload</p>
                <p className="mt-1 text-2xl font-bold">{reportMetrics?.upload ?? 0}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <BreakdownTable
                title="Breakdown per Aksi"
                items={report.selectedPeriod.actions}
                emptyText="Belum ada aksi pada periode ini."
              />
              <BreakdownTable
                title="Breakdown per Entitas"
                items={report.selectedPeriod.entities}
                emptyText="Belum ada entitas pada periode ini."
              />
            </div>
          </>
        )}
      </section>

      <section className="rounded-2xl border border-brand-100 bg-white p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink">Data Log Aktivitas</h2>
            <p className="text-sm text-ink-muted">Lihat detail audit log perubahan dan aktivitas login admin.</p>
          </div>
          <div className="text-sm text-ink-muted">
            {meta.total} total log
          </div>
        </div>

        <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] items-end">
          <Field label="Cari">
            <div className="relative">
              <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input
                type="search"
                placeholder="Cari email, aksi, entitas, ringkasan, atau IP..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-full border border-brand-200 bg-white py-2.5 pl-9 pr-4 text-sm placeholder:text-ink-soft focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            </div>
          </Field>
          <Field label="Aksi">
            <SearchableSelect
              searchable={false}
              rounded="full"
              value={filterAksi}
              onChange={setFilterAksi}
              placeholder="Semua Aksi"
              options={meta.aksiOptions.map((item) => ({
                value: item,
                label: item,
                dotColor: item === 'delete' ? 'bg-red-500' : item === 'update' ? 'bg-amber-500' : 'bg-brand',
              }))}
            />
          </Field>
          <Field label="Entitas">
            <SearchableSelect
              searchable={false}
              rounded="full"
              value={filterEntitas}
              onChange={setFilterEntitas}
              placeholder="Semua Entitas"
              options={meta.entitasOptions.map((item) => ({
                value: item,
                label: item,
                dotColor: 'bg-sky-500',
              }))}
            />
          </Field>
          <Field label="Periode">
            <SearchableSelect
              searchable={false}
              rounded="full"
              value={logPeriod}
              onChange={(value) => setLogPeriod(value as Period)}
              options={PERIOD_OPTIONS.map((item) => ({
                value: item.value,
                label: item.label,
                dotColor: item.dotColor,
              }))}
            />
          </Field>
        </div>

        <div className="mb-4 flex items-center justify-between gap-3 text-sm text-ink-muted">
          <span>{meta.total} log ditemukan</span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setFilterAksi('');
                setFilterEntitas('');
                setLogPeriod('all');
              }}
              className="rounded-full border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50"
            >
              Reset Filter
            </button>
          )}
        </div>

        <div className="overflow-x-auto rounded-2xl border border-brand-100">
          <table className="w-full text-sm">
            <thead className="bg-brand-50/70">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Waktu</th>
                <th className="px-4 py-3 text-left font-semibold">Pengguna</th>
                <th className="px-4 py-3 text-left font-semibold">Aksi</th>
                <th className="px-4 py-3 text-left font-semibold">Entitas</th>
                <th className="px-4 py-3 text-left font-semibold">Ringkasan</th>
                <th className="px-4 py-3 text-left font-semibold">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-50">
              {loadingLogs ? (
                <TableLoadingRow colSpan={6} label="Memuat log aktivitas..." />
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-ink-muted">
                    Tidak ada log aktivitas untuk filter saat ini.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item._id} className="hover:bg-brand-50/30">
                    <td className="whitespace-nowrap px-4 py-3 text-ink-muted">{formatDateTime(item.createdAt)}</td>
                    <td className="px-4 py-3 text-ink">{item.email || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${actionTone(item.aksi)}`}>
                        {item.aksi || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink">
                      <div className="font-semibold">{item.entitas || '-'}</div>
                      {item.entitasId && <div className="text-xs text-ink-muted">{item.entitasId}</div>}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{item.ringkasan || '-'}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setDetail(item)}
                        className="rounded-full border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50"
                      >
                        Lihat Detail
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-ink-muted">
            Halaman {meta.page} dari {meta.totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={meta.page <= 1 || loadingLogs}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="rounded-full border border-brand-200 px-4 py-2 font-semibold text-brand-700 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Sebelumnya
            </button>
            <button
              type="button"
              disabled={meta.page >= meta.totalPages || loadingLogs}
              onClick={() => setPage((prev) => Math.min(meta.totalPages, prev + 1))}
              className="rounded-full border border-brand-200 px-4 py-2 font-semibold text-brand-700 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Berikutnya
            </button>
          </div>
        </div>
      </section>

      {detail && (
        <ModalShell
          title="Detail Log Aktivitas"
          subtitle={`${detail.email || '-'} • ${formatDateTime(detail.createdAt)}`}
          onClose={() => setDetail(null)}
          maxWidth="max-w-4xl"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-brand-100 bg-white p-4">
              <h3 className="text-sm font-semibold text-ink">Informasi Umum</h3>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-muted">Aksi</dt>
                  <dd className="font-semibold text-ink">{detail.aksi || '-'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-muted">Entitas</dt>
                  <dd className="font-semibold text-ink">{detail.entitas || '-'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-muted">Entity ID</dt>
                  <dd className="break-all text-right text-ink">{detail.entitasId || '-'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-muted">IP</dt>
                  <dd className="text-ink">{detail.ip || '-'}</dd>
                </div>
              </dl>
            </div>
            <div className="rounded-2xl border border-brand-100 bg-white p-4">
              <h3 className="text-sm font-semibold text-ink">Keterangan</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">{detail.ringkasan || 'Tidak ada ringkasan.'}</p>
              <div className="mt-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-muted">User Agent</p>
                <p className="rounded-xl bg-gray-50 px-4 py-3 text-xs leading-relaxed text-ink-muted">
                  {detail.userAgent || 'Tidak ada user agent.'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-semibold text-ink">Data Sebelum</p>
              <JsonPreview value={detail.before} />
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-ink">Data Sesudah</p>
              <JsonPreview value={detail.after} />
            </div>
          </div>

          <ModalFooter>
            <BtnCancel onClick={() => setDetail(null)}>Tutup</BtnCancel>
          </ModalFooter>
        </ModalShell>
      )}
    </div>
  );
}
