'use client';

import { swalSuccess, swalError, swalConfirm } from '@/lib/swal';
import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import PageHeader from '@/components/admin/PageHeader';
import TableLoadingRow from '@/components/admin/TableLoadingRow';
import { Field, inputClass, selectClass } from '@/components/admin/Field';
import ModalShell, { ErrorAlert, ModalFooter, BtnCancel, BtnSave } from '@/components/admin/ModalShell';
import SearchableSelect from '@/components/ui/SearchableSelect';
import Link from 'next/link';
import TabStatus, { panelTab, useTabUrl } from '@/components/admin/TabStatus';
import LabelStatus from '@/components/admin/LabelStatus';
import { URUTAN_STATUS, hariKe, hariMenujuMulai, sisaHari, statusJadwal, totalHari } from '@/lib/statusPeriode';

type JalurOpt = { _id: string; nama: string };

type Jadwal = {
  _id: string;
  judul: string;
  ke: number;
  jalur: string[];          // array of jalur IDs (or populated objects)
  mulai: string;
  selesai: string;
  status: boolean;
  tahun: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
};

const thisYear = `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;

const empty: Jadwal = {
  _id: '',
  judul: '',
  ke: 1,
  jalur: [],
  mulai: dayjs().format('YYYY-MM-DD'),
  selesai: dayjs().add(7, 'day').format('YYYY-MM-DD'),
  status: true,
  tahun: thisYear,
};

const PAGE_SIZE = 10;

function fmtDate(d: string) {
  return dayjs(d).format('DD MMM YYYY');
}

function getIds(v: (string | JalurOpt)[]): string[] {
  return v.map((x) => (typeof x === 'object' ? x._id : x));
}

function getJalurLabels(item: any, jalurOptions: JalurOpt[]): string[] {
  if (!Array.isArray(item.jalur) || item.jalur.length === 0) return [];
  return item.jalur.map((j: any) =>
    typeof j === 'object' ? j.nama : jalurOptions.find((o) => o._id === j)?.nama ?? j,
  );
}

export default function JadwalAdminPage() {
  const [items, setItems] = useState<Jadwal[]>([]);
  const [jalurOptions, setJalurOptions] = useState<JalurOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Jadwal | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterTahun, setFilterTahun] = useState('');
  const [cakupan, setCakupan] = useState<Record<string, number>>({});
  const [totalProdi, setTotalProdi] = useState(0);
  // Tab bawaan: Berjalan & akan datang; Arsip memuat jadwal yang sudah berakhir (FR-69).
  const [tab, pilihTab] = useTabUrl(['berjalan', 'arsip'], 'berjalan');
  const [page, setPage] = useState(1);

  async function load() {
    setLoading(true);
    const [jadwalRes, jalurRes] = await Promise.all([
      fetch('/api/admin/jadwal', { cache: 'no-store' }),
      fetch('/api/admin/jalur-seleksi', { cache: 'no-store' }),
    ]);
    const jd = await jadwalRes.json();
    const jl = await jalurRes.json();
    setItems(
      (jd.items || [])
        .map((i: any) => ({
          ...i,
          jalur: getIds(i.jalur || []),
          mulai: dayjs(i.mulai).format('YYYY-MM-DD'),
          selesai: dayjs(i.selesai).format('YYYY-MM-DD'),
          // Status dihitung dari tanggal tersimpan, bukan dari string tampilan (FR-61).
          _status: statusJadwal(i, new Date()),
        })),
    );
    setJalurOptions(jl.items || []);
    setCakupan(jd.cakupan || {});
    setTotalProdi(jd.totalProdi || 0);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { setPage(1); }, [search, filterTahun, tab]);

  function openCreate() {
    setEditing({ ...empty });
    setErr(null);
  }

  function openEdit(item: Jadwal) {
    setEditing({ ...item, jalur: getIds(item.jalur) });
    setErr(null);
  }

  function toggleJalur(id: string) {
    if (!editing) return;
    const cur = editing.jalur;
    setEditing({
      ...editing,
      jalur: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    });
  }

  async function onSave() {
    if (!editing) return;
    if (editing.jalur.length === 0) {
      setErr('Minimal satu jalur harus dipilih');
      return;
    }
    setSaving(true);
    setErr(null);
    const isEdit = !!editing._id;
    const payload = {
      judul:   editing.judul,
      ke:      editing.ke,
      jalur:   editing.jalur,
      mulai:   editing.mulai,
      selesai: editing.selesai,
      status:  editing.status,
      tahun:   editing.tahun,
    };
    const res = await fetch(
      isEdit ? `/api/admin/jadwal/${editing._id}` : '/api/admin/jadwal',
      {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setErr(data.error || 'Gagal menyimpan'); return; }
    setEditing(null);
    swalSuccess('Berhasil Disimpan');
    load();
  }

  async function onDelete(id: string) {
    const { isConfirmed } = await swalConfirm('Hapus Jadwal?', 'Tindakan ini tidak dapat dibatalkan.');
    if (!isConfirmed) return;
    const res = await fetch(`/api/admin/jadwal/${id}`, { method: 'DELETE' });
    if (res.ok) { swalSuccess('Berhasil Dihapus'); load(); }
    else await swalError('Gagal Menghapus');
  }

  function getJalurNames(item: any): string {
    const labels = getJalurLabels(item, jalurOptions);
    return labels.length ? labels.join(', ') : '—';
  }

  const q = search.toLowerCase();
  const hasActiveFilters = Boolean(q || (tab === 'arsip' && filterTahun));
  const jumlahArsip = items.filter((j: any) => j._status === 'arsip').length;
  const jumlahBerjalan = items.length - jumlahArsip;
  const tahunArsip = [...new Set(items.filter((j: any) => j._status === 'arsip').map((j: any) => j.tahun as string))].sort().reverse();
  const filtered = items.filter((j: any) => {
    if ((j._status === 'arsip') !== (tab === 'arsip')) return false;
    if (tab === 'arsip' && filterTahun && j.tahun !== filterTahun) return false;
    const jalurNames = getJalurNames(j).toLowerCase();
    const matchSearch =
      !q ||
      j.judul.toLowerCase().includes(q) ||
      j.tahun.toLowerCase().includes(q) ||
      jalurNames.includes(q);
    return matchSearch;
  }).sort((a: any, b: any) =>
    tab === 'arsip'
      ? new Date(b.selesai).getTime() - new Date(a.selesai).getTime()
      : URUTAN_STATUS[a._status as keyof typeof URUTAN_STATUS] - URUTAN_STATUS[b._status as keyof typeof URUTAN_STATUS] ||
        new Date(a.mulai).getTime() - new Date(b.mulai).getTime(),
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div>
      <PageHeader
        title="Jadwal"
        description="Kelola jadwal pendaftaran per jalur dan tahun ajaran."
        action={
          <button
            onClick={openCreate}
            className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
          >
            + Tambah Jadwal
          </button>
        }
      />

      <TabStatus
        idDasar="jadwal"
        label="Status jadwal"
        aktif={tab}
        onPilih={pilihTab}
        tabs={[
          { id: 'berjalan', label: 'Berjalan & akan datang', jumlah: jumlahBerjalan },
          { id: 'arsip', label: 'Arsip', jumlah: jumlahArsip },
        ]}
      />

      <div {...panelTab('jadwal', tab, tab)}>
      <div className="mb-4 rounded-2xl border border-brand-100 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-ink">Filter Data</h2>
            <p className="text-xs text-ink-muted">Cari jadwal{tab === 'arsip' ? ' dan saring menurut tahun ajaran' : ''}.</p>
          </div>
          <div className="flex items-center gap-3 text-sm text-ink-muted">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => { setSearch(''); setFilterTahun(''); }}
                className="rounded-full border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50"
              >
                Reset Filter
              </button>
            )}
            <span>{filtered.length} hasil ditemukan</span>
          </div>
        </div>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] items-end">
          <Field label="Cari">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-soft pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input
                type="search"
                placeholder="Cari judul, tahun, atau jalur..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-full border border-brand-200 bg-white pl-9 pr-4 py-2.5 text-sm placeholder:text-ink-soft focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand-400"
              />
            </div>
          </Field>
          {tab === 'arsip' && (
            <Field label="Tahun ajaran">
              <SearchableSelect
                searchable={false}
                rounded="full"
                options={tahunArsip.map((t) => ({ value: t, label: t }))}
                value={filterTahun}
                placeholder="Semua tahun ajaran"
                onChange={setFilterTahun}
              />
            </Field>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-brand-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-brand-50/70">
            <tr>
              <th className="text-left px-5 py-3 font-semibold whitespace-nowrap">No.</th>
              <th className="text-left px-5 py-3 font-semibold whitespace-nowrap">Judul</th>
              <th className="text-left px-5 py-3 font-semibold whitespace-nowrap">Tahun</th>
              <th className="text-left px-5 py-3 font-semibold whitespace-nowrap">Ke</th>
              <th className="text-left px-5 py-3 font-semibold whitespace-nowrap">Jalur</th>
              <th className="text-left px-5 py-3 font-semibold whitespace-nowrap">Mulai</th>
              <th className="text-left px-5 py-3 font-semibold whitespace-nowrap">Selesai</th>
              <th className="text-left px-5 py-3 font-semibold whitespace-nowrap">Status</th>
              <th className="px-5 py-3 whitespace-nowrap">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-50">
            {loading ? (
              <TableLoadingRow colSpan={9} />
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="px-5 py-8 text-center text-ink-muted">{search ? 'Tidak ada hasil untuk pencarian ini.' : tab === 'arsip' ? 'Belum ada jadwal di arsip.' : 'Tidak ada jadwal berjalan maupun akan datang.'}</td></tr>
            ) : (
              pageItems.map((j: any, index: number) => (
                <tr key={j._id} className="hover:bg-brand-50/30">
                  <td className="px-5 py-3 text-ink-muted whitespace-nowrap">{(safePage - 1) * PAGE_SIZE + index + 1}</td>
                  <td className="px-5 py-3 text-ink">
                    <span className="font-medium">{j.judul}</span>
                    {(() => {
                      const s = j._status as string;
                      const total = totalHari(j.mulai, j.selesai);
                      const ke = hariKe(j.mulai);
                      const sisa = sisaHari(j.selesai);
                      const menuju = hariMenujuMulai(j.mulai);
                      const n = cakupan[j._id] ?? 0;
                      return (
                        <>
                          {s === 'berjalan' && ke && total && sisa !== null && (
                            <span className="mt-0.5 block text-xs text-ink-muted">Hari ke-{ke} dari {total} · sisa {sisa} hari</span>
                          )}
                          {s === 'akan-datang' && menuju && <span className="mt-0.5 block text-xs text-ink-muted">Mulai {menuju} hari lagi</span>}
                          {(s === 'berjalan' || s === 'akan-datang') && totalProdi > 0 && n < totalProdi && (
                            <Link href="/admin/biaya" className="mt-0.5 block text-xs font-semibold text-amber-700 hover:underline">
                              Biaya {n} dari {totalProdi} prodi · {n === 0 ? 'Isi biaya' : 'Lengkapi biaya'} →
                            </Link>
                          )}
                        </>
                      );
                    })()}
                  </td>
                  <td className="px-5 py-3 text-ink-muted whitespace-nowrap">{j.tahun}</td>
                  <td className="px-5 py-3 text-ink-muted text-center whitespace-nowrap">{j.ke}</td>
                  <td className="px-5 py-3">
                    {(() => {
                      const jalurLabels = getJalurLabels(j, jalurOptions);
                      if (jalurLabels.length === 0)
                        return <span className="text-xs text-ink-muted">—</span>;

                      const MAX_SHOW = 2;
                      const visible = jalurLabels.slice(0, MAX_SHOW);
                      const rest = jalurLabels.slice(MAX_SHOW);

                      return (
                        <div className="flex flex-wrap gap-1.5">
                          {visible.map((label) => (
                            <span
                              key={`${j._id}-${label}`}
                              className="inline-flex rounded-full border border-brand-100 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700"
                            >
                              {label}
                            </span>
                          ))}
                          {rest.length > 0 && (
                            <span
                              title={rest.join(', ')}
                              className="inline-flex cursor-default rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-500"
                            >
                              +{rest.length} lagi
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-5 py-3 text-ink-muted whitespace-nowrap">{fmtDate(j.mulai)}</td>
                  <td className="px-5 py-3 text-ink-muted whitespace-nowrap">{fmtDate(j.selesai)}</td>
                  <td className="px-5 py-3">
                    <LabelStatus status={j._status} />
                  </td>
                  <td className="px-5 py-3 text-right space-x-2 whitespace-nowrap">
                    <button
                      onClick={() => openEdit(j)}
                      className="rounded-full border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(j._id)}
                      className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-ink-muted">
          <span>
            {filtered.length} data &bull; halaman {safePage} dari {totalPages}
          </span>
          <div className="flex gap-1">
            <button onClick={() => setPage(1)} disabled={safePage === 1} className="rounded-full px-3 py-1.5 font-semibold hover:bg-brand-50 disabled:opacity-30 disabled:cursor-not-allowed">«</button>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1} className="rounded-full px-3 py-1.5 font-semibold hover:bg-brand-50 disabled:opacity-30 disabled:cursor-not-allowed">‹</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((n) => n === 1 || n === totalPages || Math.abs(n - safePage) <= 1)
              .reduce<(number | '...')[]>((acc, n, idx, arr) => {
                if (idx > 0 && n - (arr[idx - 1] as number) > 1) acc.push('...');
                acc.push(n);
                return acc;
              }, [])
              .map((n, i) =>
                n === '...' ? (
                  <span key={`ellipsis-${i}`} className="px-2 py-1.5">…</span>
                ) : (
                  <button key={n} onClick={() => setPage(n as number)} className={`rounded-full px-3 py-1.5 font-semibold transition-colors ${safePage === n ? 'bg-brand text-white' : 'hover:bg-brand-50 text-ink-muted'}`}>{n}</button>
                ),
              )}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} className="rounded-full px-3 py-1.5 font-semibold hover:bg-brand-50 disabled:opacity-30 disabled:cursor-not-allowed">›</button>
            <button onClick={() => setPage(totalPages)} disabled={safePage === totalPages} className="rounded-full px-3 py-1.5 font-semibold hover:bg-brand-50 disabled:opacity-30 disabled:cursor-not-allowed">»</button>
          </div>
        </div>
      )}
      </div>

      {editing && (
        <ModalShell title={editing._id ? 'Ubah Jadwal' : 'Tambah Jadwal'} onClose={() => setEditing(null)}>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Judul" className="md:col-span-2">
                <input
                  className={inputClass}
                  value={editing.judul}
                  onChange={(e) => setEditing({ ...editing, judul: e.target.value })}
                  placeholder="Contoh: Pendaftaran Gelombang 1"
                />
              </Field>

              <Field label="Tahun Ajaran">
                <input
                  className={inputClass}
                  value={editing.tahun}
                  onChange={(e) => setEditing({ ...editing, tahun: e.target.value })}
                  placeholder="2026/2027"
                />
              </Field>

              <Field label="Ke (Gelombang)">
                <input
                  type="number"
                  min={1}
                  step={1}
                  className={inputClass}
                  value={editing.ke}
                  onChange={(e) => setEditing({ ...editing, ke: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                  placeholder="1"
                />
              </Field>

              <Field label="Status">
                <select
                  className={selectClass}
                  value={editing.status ? '1' : '0'}
                  onChange={(e) => setEditing({ ...editing, status: e.target.value === '1' })}
                >
                  <option value="1">Aktif</option>
                  <option value="0">Nonaktif</option>
                </select>
              </Field>

              <Field label="Tanggal Mulai">
                <input
                  type="date"
                  className={inputClass}
                  value={editing.mulai}
                  onChange={(e) => setEditing({ ...editing, mulai: e.target.value })}
                />
              </Field>

              <Field label="Tanggal Selesai">
                <input
                  type="date"
                  className={inputClass}
                  value={editing.selesai}
                  onChange={(e) => setEditing({ ...editing, selesai: e.target.value })}
                />
              </Field>

              {/* Jalur — multi checkbox */}
              <Field
                label="Jalur Seleksi"
                hint="Pilih minimal satu jalur"
                className="md:col-span-2"
              >
                {jalurOptions.length === 0 ? (
                  <p className="text-xs text-ink-muted">Belum ada jalur seleksi.</p>
                ) : (
                  <div className="rounded-xl border border-brand-100 bg-brand-50/30 p-3 grid gap-2 sm:grid-cols-2">
                    {jalurOptions.map((opt) => {
                      const checked = editing.jalur.includes(opt._id);
                      return (
                        <label
                          key={opt._id}
                          className={`flex items-center gap-2.5 rounded-lg px-3 py-2 cursor-pointer transition select-none text-sm ${
                            checked
                              ? 'bg-brand-100 text-brand-800 font-semibold'
                              : 'bg-white text-ink hover:bg-brand-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="accent-brand"
                            checked={checked}
                            onChange={() => toggleJalur(opt._id)}
                          />
                          {opt.nama}
                        </label>
                      );
                    })}
                  </div>
                )}
              </Field>
            </div>

            {err && <ErrorAlert>{err}</ErrorAlert>}
            <ModalFooter>
              <BtnCancel onClick={() => setEditing(null)} />
              <BtnSave onClick={onSave} loading={saving} />
            </ModalFooter>
        </ModalShell>
      )}
    </div>
  );
}
