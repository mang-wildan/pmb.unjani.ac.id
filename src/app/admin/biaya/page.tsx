'use client';

import { swalSuccess, swalError, swalConfirm } from '@/lib/swal';
import { Fragment, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import PageHeader from '@/components/admin/PageHeader';
import TableLoadingRow from '@/components/admin/TableLoadingRow';
import { Field, inputClass, selectClass } from '@/components/admin/Field';
import ModalShell, { ErrorAlert, ModalFooter, BtnCancel, BtnSave } from '@/components/admin/ModalShell';
import SearchableSelect, { type SearchableSelectOption } from '@/components/ui/SearchableSelect';
import TabStatus, { panelTab, useTabUrl } from '@/components/admin/TabStatus';
import LabelStatus from '@/components/admin/LabelStatus';
import { URUTAN_STATUS, statusJadwal, type StatusPeriode } from '@/lib/statusPeriode';

type Opt = {
  _id: string;
  nama: string;
  singkatan?: string;
  jenjang?: string;
  judul?: string;
  tahun?: string;
  mulai?: string;
  selesai?: string;
  status?: boolean;
};

type BiayaItem = {
  _id: string;
  programStudi_id: string | Opt;
  jalur_id: string | Opt;
  jadwal_id: string | Opt | null;
  kelas_id?: string | Opt | null;
  biaya: number;
  biayaPerSemester?: number | null;
  biayaTambahan?: number | null;
  persentase?: string[];
};

type ImportResult = {
  success: number;
  errors: { row: number; message: string }[];
};

const empty: BiayaItem = {
  _id: '',
  programStudi_id: '',
  jalur_id: '',
  jadwal_id: '',
  kelas_id: '',
  biaya: 0,
  biayaPerSemester: null,
  biayaTambahan: null,
  persentase: ['100%'],
};

function getId(v: string | Opt | null | undefined): string {
  if (!v) return '';
  if (typeof v === 'object') return v._id;
  return v;
}

function getLabel(v: string | Opt | null | undefined, list: Opt[]): string {
  if (!v) return '—';
  if (typeof v === 'object') {
    if (v.judul) return `${v.judul}${v.tahun ? ` (${v.tahun})` : ''}`;
    if (v.singkatan) return `${v.singkatan}${v.jenjang ? ` — ${v.jenjang}` : ''}`;
    return v.nama;
  }
  const found = list.find((o) => o._id === v);
  if (!found) return '—';
  if (found.judul) return `${found.judul}${found.tahun ? ` (${found.tahun})` : ''}`;
  if (found.singkatan) return `${found.singkatan}${found.jenjang ? ` — ${found.jenjang}` : ''}`;
  return found.nama;
}

/** Status biaya mengikuti jadwal yang dirujuknya (FR-61, FR-70). Jadwal yang sudah dihapus = 'yatim'. */
type StatusBiaya = StatusPeriode | 'yatim';
function statusBiaya(b: BiayaItem): StatusBiaya {
  const j = b.jadwal_id;
  if (!j || typeof j !== 'object') return 'yatim';
  return statusJadwal(j);
}

function fmtRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n);
}

const PAGE_SIZE = 15;

export default function BiayaPage() {
  const [items, setItems] = useState<BiayaItem[]>([]);
  const [prodiList, setProdiList] = useState<Opt[]>([]);
  const [jalurList, setJalurList] = useState<Opt[]>([]);
  const [jadwalList, setJadwalList] = useState<Opt[]>([]);
  const [kelasList, setKelasList] = useState<Opt[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BiayaItem | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filterJalurId, setFilterJalurId] = useState('');
  const [filterJadwalId, setFilterJadwalId] = useState('');
  const [filterTahun, setFilterTahun] = useState('');
  // Grup yang daftar "prodi belum ada biaya"-nya sedang dibuka (FR-70).
  const [belumTerbuka, setBelumTerbuka] = useState<Record<string, boolean>>({});
  // Tab bawaan: Berjalan & akan datang; Arsip memuat biaya dari jadwal yang sudah berakhir (FR-70).
  const [tab, pilihTab] = useTabUrl(['berjalan', 'arsip'], 'berjalan');

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [pctInput, setPctInput] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const [exportJadwalId, setExportJadwalId] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportErr, setExportErr] = useState<string | null>(null);

  async function loadOpts() {
    const safeJson = (r: Response): Promise<any> => r.ok ? r.json().catch(() => ({})) : Promise.resolve({});
    const [p, j, jd, k] = await Promise.all([
      fetch('/api/admin/program-studi', { cache: 'no-store' }).then(safeJson),
      fetch('/api/admin/jalur-seleksi', { cache: 'no-store' }).then(safeJson),
      fetch('/api/admin/jadwal', { cache: 'no-store' }).then(safeJson),
      fetch('/api/admin/kelas', { cache: 'no-store' }).then(safeJson),
    ]);
    setProdiList(p.items || []);
    setJalurList(j.items || []);
    setJadwalList(jd.items || []);
    setKelasList(k.items || []);
  }

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/biaya', { cache: 'no-store' });
    const data = await res.json();
    setItems(data.items || []);
    setLoading(false);
  }

  useEffect(() => {
    loadOpts();
    load();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterJalurId, filterJadwalId, filterTahun, tab]);

  // Pilihan jadwal berbeda per tab, jadi pilihan lama dilepas saat tab berganti.
  useEffect(() => {
    setFilterJadwalId('');
    setFilterTahun('');
  }, [tab]);

  function openCreate() {
    setEditing({ ...empty });
    setPctInput('');
    setErr(null);
  }

  function openEdit(item: BiayaItem) {
    setEditing({
      ...item,
      programStudi_id: getId(item.programStudi_id),
      jalur_id: getId(item.jalur_id),
      jadwal_id: getId(item.jadwal_id),
      kelas_id: getId(item.kelas_id),
      persentase: item.persentase && item.persentase.length > 0 ? [...item.persentase] : ['100%'],
    });
    setPctInput('');
    setErr(null);
  }

  function addPersentase() {
    if (!editing) return;
    let val = pctInput.trim();
    if (!val) return;
    if (!val.endsWith('%')) val = val + '%';
    const cur = editing.persentase ?? [];
    if (!cur.includes(val)) {
      setEditing({ ...editing, persentase: [...cur, val] });
    }
    setPctInput('');
  }

  function removePersentase(idx: number) {
    if (!editing) return;
    const cur = editing.persentase ?? [];
    setEditing({ ...editing, persentase: cur.filter((_, i) => i !== idx) });
  }

  function onPctKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); addPersentase(); }
  }

  async function onSave() {
    if (!editing) return;
    const jadwalId = getId(editing.jadwal_id);
    if (!jadwalId) {
      setErr('Jadwal wajib diisi');
      return;
    }
    setSaving(true);
    setErr(null);
    const isEdit = !!editing._id;
    const persentase =
      editing.persentase && editing.persentase.length > 0 ? editing.persentase : ['100%'];
    const payload = {
      programStudi_id: getId(editing.programStudi_id),
      jalur_id: getId(editing.jalur_id),
      jadwal_id: jadwalId,
      kelas_id: getId(editing.kelas_id) || null,
      biaya: Number(editing.biaya) || 0,
      biayaPerSemester: editing.biayaPerSemester != null ? Number(editing.biayaPerSemester) : null,
      biayaTambahan: editing.biayaTambahan != null ? Number(editing.biayaTambahan) : null,
      persentase,
    };
    const res = await fetch(
      isEdit ? `/api/admin/biaya/${editing._id}` : '/api/admin/biaya',
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
    await load();
  }

  async function onDelete(id: string) {
    const { isConfirmed } = await swalConfirm('Hapus Data Biaya?', 'Tindakan ini tidak dapat dibatalkan.');
    if (!isConfirmed) return;
    const res = await fetch(`/api/admin/biaya/${id}`, { method: 'DELETE' });
    if (res.ok) { swalSuccess('Berhasil Dihapus'); load(); }
    else await swalError('Gagal Menghapus');
  }

  async function onImportFile(file: File) {
    setImporting(true);
    const fd = new FormData();
    fd.set('file', file);
    const res = await fetch('/api/admin/biaya/import', { method: 'POST', body: fd });
    const data = await res.json();
    setImporting(false);
    if (!res.ok) {
      setImportResult({ success: 0, errors: [{ row: 0, message: data.error || 'Gagal import' }] });
      return;
    }
    setImportResult(data);
    if (data.success > 0) await load();
  }

  function openExport() {
    setExportJadwalId('');
    setExportErr(null);
    setExportOpen(true);
  }

  async function onExportCsv() {
    if (!exportJadwalId) {
      setExportErr('Gelombang wajib dipilih');
      return;
    }

    try {
      setExporting(true);
      setExportErr(null);

      const res = await fetch(`/api/admin/biaya/export?jadwal_id=${encodeURIComponent(exportJadwalId)}`, {
        cache: 'no-store',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setExportErr(data.error || 'Gagal mengunduh CSV');
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const disposition = res.headers.get('content-disposition') || '';
      const match = disposition.match(/filename="([^\"]+)"/i);
      link.href = url;
      link.download = match?.[1] || 'biaya.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setExportOpen(false);
      swalSuccess('CSV berhasil diunduh');
    } catch {
      setExportErr('Gagal mengunduh CSV');
    } finally {
      setExporting(false);
    }
  }

  const jadwalOptLabel = (j: Opt) =>
    `${j.judul || j.nama}${j.tahun ? ` — ${j.tahun}` : ''}`;

  const jadwalSelectOptions: SearchableSelectOption[] = jadwalList.map((j) => ({
    value: j._id,
    label: jadwalOptLabel(j),
    sublabel: j.nama,
  }));

  const searchLower = search.toLowerCase().trim();
  const hasActiveFilters = Boolean(searchLower || filterJalurId || filterJadwalId || filterTahun);
  const jumlahArsip = items.filter((b) => statusBiaya(b) === 'arsip').length;
  const jumlahBerjalan = items.length - jumlahArsip;
  // Jadwal yang bisa dipilih di filter hanya yang sesuai tab aktif.
  const jadwalDiTab = jadwalList.filter((j) => (statusJadwal(j) === 'arsip') === (tab === 'arsip'));
  const tahunArsip = [...new Set(jadwalList.filter((j) => statusJadwal(j) === 'arsip').map((j) => j.tahun ?? '').filter(Boolean))].sort().reverse();
  // Pengelompokan per jadwal (FR-70). Biaya yatim (jadwal terhapus) selalu di akhir.
  const kunciGrup = (b: BiayaItem) => (b.jadwal_id && typeof b.jadwal_id === 'object' ? b.jadwal_id._id : 'yatim');
  const waktuJadwal = (b: BiayaItem, kolom: 'mulai' | 'selesai') =>
    b.jadwal_id && typeof b.jadwal_id === 'object' && b.jadwal_id[kolom] ? new Date(b.jadwal_id[kolom] as string).getTime() : 0;
  const urutGrup = (a: BiayaItem, b: BiayaItem) => {
    const ka = kunciGrup(a);
    const kb = kunciGrup(b);
    if (ka === kb) return 0;
    const sa = statusBiaya(a);
    const sb = statusBiaya(b);
    if (sa === 'yatim' || sb === 'yatim') return sa === 'yatim' ? 1 : -1;
    if (tab === 'arsip') return waktuJadwal(b, 'selesai') - waktuJadwal(a, 'selesai') || ka.localeCompare(kb);
    return URUTAN_STATUS[sa] - URUTAN_STATUS[sb] || waktuJadwal(a, 'mulai') - waktuJadwal(b, 'mulai') || ka.localeCompare(kb);
  };
  // Cakupan dihitung dari semua biaya jadwal itu (bukan hasil saringan): prodi unik dibanding seluruh prodi.
  const infoGrup = (kunci: string) => {
    const idProdi = new Set(items.filter((b) => kunciGrup(b) === kunci).map((b) => getId(b.programStudi_id)));
    return {
      nilai: idProdi.size,
      total: prodiList.length,
      belum: prodiList.filter((p) => !idProdi.has(p._id)),
    };
  };
  const filtered = items.filter((b) => {
    if ((statusBiaya(b) === 'arsip') !== (tab === 'arsip')) return false;
    if (tab === 'arsip' && filterTahun) {
      const j = b.jadwal_id;
      if (!j || typeof j !== 'object' || j.tahun !== filterTahun) return false;
    }
    const matchSearch = !searchLower || (
      getLabel(b.programStudi_id, prodiList).toLowerCase().includes(searchLower) ||
      getLabel(b.jalur_id, jalurList).toLowerCase().includes(searchLower) ||
      getLabel(b.jadwal_id, jadwalList).toLowerCase().includes(searchLower) ||
      getLabel(b.kelas_id, kelasList).toLowerCase().includes(searchLower)
    );
    const matchJalur = !filterJalurId || getId(b.jalur_id) === filterJalurId;
    const matchJadwal = !filterJadwalId || getId(b.jadwal_id) === filterJadwalId;
    return matchSearch && matchJalur && matchJadwal;
  }).sort(urutGrup);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  const kepalaGrup = (b: BiayaItem) => {
    const kunci = kunciGrup(b);
    const st = statusBiaya(b);
    const j = b.jadwal_id && typeof b.jadwal_id === 'object' ? b.jadwal_id : null;
    const info = infoGrup(kunci);
    const persen = info.total > 0 ? Math.round((info.nilai / info.total) * 100) : 0;
    const terbuka = !!belumTerbuka[kunci];
    return (
      <tr data-grup-biaya={kunci} className="bg-brand-50/60">
        <td colSpan={9} className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {st !== 'yatim' && <LabelStatus status={st} />}
            <h3 className="text-sm font-bold text-ink">
              {j ? `${j.judul}${j.tahun ? ` · ${j.tahun}` : ''}` : 'Jadwal tidak ditemukan'}
            </h3>
            {j && info.total > 0 && (
              <span className="text-xs tabular-nums text-ink-muted">
                {info.nilai} dari {info.total} prodi
              </span>
            )}
          </div>
          {j && info.total > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <div
                className="h-2 min-w-[140px] max-w-xs flex-1 overflow-hidden rounded-full bg-white"
                role="img"
                aria-label={`${persen} persen prodi sudah punya biaya`}
              >
                <div
                  className={`h-full rounded-full ${info.nilai === 0 ? 'bg-red-600' : info.nilai < info.total ? 'bg-amber-500' : 'bg-brand'}`}
                  style={{ width: `${persen}%` }}
                />
              </div>
              <span className="text-xs font-bold tabular-nums text-ink-muted">{persen}%</span>
              {info.belum.length > 0 && (
                <button
                  type="button"
                  aria-expanded={terbuka}
                  onClick={() => setBelumTerbuka((prev) => ({ ...prev, [kunci]: !prev[kunci] }))}
                  className="text-xs font-semibold text-amber-700 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/25"
                >
                  {info.belum.length} prodi belum ada biaya {terbuka ? '▴' : '▾'}
                </button>
              )}
            </div>
          )}
          {j && terbuka && info.belum.length > 0 && (
            <ul data-daftar-belum="" className="mt-2 grid gap-x-6 gap-y-0.5 text-xs text-ink-muted sm:grid-cols-2 lg:grid-cols-3">
              {info.belum.map((p) => (
                <li key={p._id}>{p.nama}</li>
              ))}
            </ul>
          )}
          {!j && <p className="mt-1 text-xs text-ink-muted">Jadwal yang dirujuk biaya ini sudah dihapus. Perbaiki jadwalnya lewat Edit, atau hapus biayanya.</p>}
        </td>
      </tr>
    );
  };

  return (
    <div>
      <PageHeader
        title="Biaya Pendidikan"
        description="Kelola data biaya per program studi, jalur, jadwal, dan kelas."
        action={
          <div className="flex items-center gap-2 flex-wrap">
            {/* Download template */}
            <a
              href="/api/admin/biaya/template"
              download
              className="rounded-full border border-brand-200 px-4 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50"
            >
              ↓ Unduh Template CSV
            </a>

            {/* Import CSV */}
            <label className={`rounded-full border border-brand-200 px-4 py-2.5 text-sm font-semibold cursor-pointer transition
              ${importing ? 'opacity-60 cursor-not-allowed text-ink-muted' : 'text-brand-700 hover:bg-brand-50'}`}>
              <span className="inline-flex items-center gap-2">
                <i className="fa-solid fa-file-import text-xs" aria-hidden />
                {importing ? 'Mengimpor...' : 'Import CSV'}
              </span>
              <input
                ref={importInputRef}
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                disabled={importing}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onImportFile(f);
                  e.target.value = '';
                }}
              />
            </label>

            <button
              onClick={openExport}
              className="rounded-full border border-brand-200 px-4 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50"
            >
              <span className="inline-flex items-center gap-2">
                <i className="fa-solid fa-file-export text-xs" aria-hidden />
                Export CSV
              </span>
            </button>

            <button
              onClick={openCreate}
              className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
            >
              + Tambah Biaya
            </button>
          </div>
        }
      />

      <TabStatus
        idDasar="biaya"
        label="Status biaya"
        aktif={tab}
        onPilih={pilihTab}
        tabs={[
          { id: 'berjalan', label: 'Berjalan & akan datang', jumlah: jumlahBerjalan },
          { id: 'arsip', label: 'Arsip', jumlah: jumlahArsip },
        ]}
      />

      <div {...panelTab('biaya', tab, tab)}>
      <div className="mb-4 rounded-2xl border border-brand-100 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-ink">Filter Data</h2>
            <p className="text-xs text-ink-muted">Saring data biaya berdasarkan jalur, jadwal{tab === 'arsip' ? ', dan tahun ajaran' : ''}.</p>
          </div>
          <div className="flex items-center gap-3 text-sm text-ink-muted">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setFilterJalurId('');
                  setFilterJadwalId('');
                  setFilterTahun('');
                }}
                className="rounded-full border border-brand-200 px-3 py-1.5 font-semibold text-brand-700 hover:bg-brand-50"
              >
                Reset Filter
              </button>
            )}
            <span>
              {filtered.length} hasil ditemukan
            </span>
          </div>
        </div>
        <div className={`grid gap-3 items-end ${tab === 'arsip' ? 'lg:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,1fr))]' : 'lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]'}`}>
          <Field label="Cari">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-soft pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input
                type="search"
                placeholder="Cari prodi, jalur, jadwal, kelas..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-full border border-brand-200 bg-white pl-9 pr-4 py-2.5 text-sm placeholder:text-ink-soft focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand-400"
              />
            </div>
          </Field>
          <Field label="Jalur">
            <select
              value={filterJalurId}
              onChange={(e) => setFilterJalurId(e.target.value)}
              className={selectClass}
              aria-label="Filter jalur"
            >
              <option value="">Semua Jalur</option>
              {jalurList.map((jalur) => (
                <option key={jalur._id} value={jalur._id}>
                  {jalur.nama}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Jadwal">
            <select
              value={filterJadwalId}
              onChange={(e) => setFilterJadwalId(e.target.value)}
              className={selectClass}
              aria-label="Filter jadwal"
            >
              <option value="">Semua Jadwal</option>
              {jadwalDiTab.map((jadwal) => (
                <option key={jadwal._id} value={jadwal._id}>
                  {jadwalOptLabel(jadwal)}
                </option>
              ))}
            </select>
          </Field>
          {tab === 'arsip' && (
            <Field label="Tahun ajaran">
              <select
                value={filterTahun}
                onChange={(e) => setFilterTahun(e.target.value)}
                className={selectClass}
                aria-label="Filter tahun ajaran"
              >
                <option value="">Semua Tahun Ajaran</option>
                {tahunArsip.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-brand-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-brand-50/70">
            <tr>
              <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Program Studi</th>
              <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Jalur</th>
              <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Jadwal</th>
              <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Kelas</th>
              <th className="text-right px-4 py-3 font-semibold whitespace-nowrap">Biaya</th>
              <th className="text-right px-4 py-3 font-semibold whitespace-nowrap">Biaya/Semester</th>
              <th className="text-right px-4 py-3 font-semibold whitespace-nowrap">SPT</th>
              <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Persentase</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-50">
            {loading ? (
              <TableLoadingRow colSpan={9} />
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-ink-muted">
                {hasActiveFilters ? 'Tidak ada data yang cocok dengan filter saat ini.' : tab === 'arsip' ? 'Belum ada data biaya di arsip.' : 'Belum ada data biaya untuk jadwal berjalan maupun akan datang.'}
              </td></tr>
            ) : (
              pageItems.map((b, idx) => (
                <Fragment key={b._id}>
                {(idx === 0 || kunciGrup(pageItems[idx - 1]) !== kunciGrup(b)) && kepalaGrup(b)}
                <tr className="hover:bg-brand-50/30">
                  <td className="px-4 py-3 font-medium text-ink">{getLabel(b.programStudi_id, prodiList)}</td>
                  <td className="px-4 py-3 text-ink-muted">{getLabel(b.jalur_id, jalurList)}</td>
                  <td className="px-4 py-3 text-ink-muted text-xs">{getLabel(b.jadwal_id, jadwalList)}</td>
                  <td className="px-4 py-3 text-ink-muted">{getLabel(b.kelas_id, kelasList)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-ink">{fmtRupiah(b.biaya)}</td>
                  <td className="px-4 py-3 text-right text-ink-muted">
                    {b.biayaPerSemester != null ? fmtRupiah(b.biayaPerSemester) : <span className="text-ink-muted/40">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-ink-muted">
                    {b.biayaTambahan != null ? fmtRupiah(b.biayaTambahan) : <span className="text-ink-muted/40">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(b.persentase && b.persentase.length > 0 ? b.persentase : ['100%']).map((p, i) => (
                        <span key={i} className="inline-flex rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700 border border-brand-100">
                          {p}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                    <button
                      onClick={() => openEdit(b)}
                      className="rounded-full border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(b._id)}
                      className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && filtered.length > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between gap-4 text-sm">
          <p className="text-ink-muted">
            Menampilkan <span className="font-semibold text-ink">{pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filtered.length)}</span> dari <span className="font-semibold text-ink">{filtered.length}</span> data
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="rounded-full border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Sebelumnya
            </button>
            <span className="text-ink-muted px-1">
              {safePage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="rounded-full border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Berikutnya →
            </button>
          </div>
        </div>
      )}
      </div>

      {editing && (
        <ModalShell title={editing._id ? 'Ubah Biaya' : 'Tambah Biaya'} onClose={() => setEditing(null)}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Program Studi" className="md:col-span-2">
              <select
                className={selectClass}
                value={getId(editing.programStudi_id)}
                onChange={(e) => setEditing({ ...editing, programStudi_id: e.target.value })}
              >
                <option value="">— Pilih Program Studi —</option>
                {prodiList.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.singkatan} — {p.nama}{p.jenjang ? ` (${p.jenjang})` : ''}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Jalur Seleksi">
              <select
                className={selectClass}
                value={getId(editing.jalur_id)}
                onChange={(e) => setEditing({ ...editing, jalur_id: e.target.value })}
              >
                <option value="">— Pilih Jalur —</option>
                {jalurList.map((j) => (
                  <option key={j._id} value={j._id}>{j.nama}</option>
                ))}
              </select>
            </Field>

            <Field label="Kelas">
              <select
                className={selectClass}
                value={getId(editing.kelas_id)}
                onChange={(e) => setEditing({ ...editing, kelas_id: e.target.value })}
              >
                <option value="">— Pilih Kelas (opsional) —</option>
                {kelasList.map((k) => (
                  <option key={k._id} value={k._id}>{k.nama} ({k.singkatan})</option>
                ))}
              </select>
            </Field>

            <Field label="Jadwal" hint="Wajib diisi" className="md:col-span-2">
              <select
                className={selectClass}
                value={getId(editing.jadwal_id)}
                onChange={(e) => setEditing({ ...editing, jadwal_id: e.target.value })}
              >
                <option value="">— Pilih Gelombang / Jadwal —</option>
                {jadwalList.map((j) => (
                  <option key={j._id} value={j._id}>{jadwalOptLabel(j)}</option>
                ))}
              </select>
            </Field>

            <Field label="Biaya (Rp)">
              <input
                type="text"
                inputMode="numeric"
                className={inputClass}
                value={editing.biaya ? editing.biaya.toLocaleString('id-ID') : ''}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '');
                  setEditing({ ...editing, biaya: Number(raw) || 0 });
                }}
                placeholder="0"
              />
            </Field>

            <Field label="Biaya per Semester (Rp)">
              <input
                type="text"
                inputMode="numeric"
                className={inputClass}
                value={editing.biayaPerSemester != null ? editing.biayaPerSemester.toLocaleString('id-ID') : ''}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '');
                  setEditing({ ...editing, biayaPerSemester: raw === '' ? null : Number(raw) });
                }}
                placeholder="0"
              />
            </Field>

            <Field label="SPT (Rp)" hint="Harga per unit per gelombang">
              <input
                type="text"
                inputMode="numeric"
                className={inputClass}
                value={editing.biayaTambahan != null ? editing.biayaTambahan.toLocaleString('id-ID') : ''}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '');
                  setEditing({ ...editing, biayaTambahan: raw === '' ? null : Number(raw) });
                }}
                placeholder="0"
              />
            </Field>

            <Field label="Persentase" hint="Cicilan pembayaran, default 100%" className="md:col-span-2">
              <div className="space-y-2">
                {(editing.persentase ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {(editing.persentase ?? []).map((p, i) => (
                      <span key={i} className="inline-flex items-center gap-1 rounded-full bg-brand-50 border border-brand-200 pl-3 pr-2 py-1 text-sm font-semibold text-brand-700">
                        {p}
                        <button
                          type="button"
                          onClick={() => removePersentase(i)}
                          className="rounded-full hover:bg-brand-100 w-4 h-4 flex items-center justify-center text-brand-500 hover:text-brand-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    className={inputClass + ' flex-1'}
                    value={pctInput}
                    onChange={(e) => setPctInput(e.target.value)}
                    onKeyDown={onPctKeyDown}
                    placeholder="Contoh: 50% atau 50"
                  />
                  <button
                    type="button"
                    onClick={addPersentase}
                    className="rounded-full border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50 whitespace-nowrap"
                  >
                    + Tambah
                  </button>
                </div>
              </div>
            </Field>
          </div>
          {err && <ErrorAlert>{err}</ErrorAlert>}
          <ModalFooter>
            <BtnCancel onClick={() => setEditing(null)} />
            <BtnSave onClick={onSave} loading={saving} />
          </ModalFooter>
        </ModalShell>
      )}

      {importResult && (
        <ModalShell title="Hasil Import CSV" onClose={() => setImportResult(null)} maxWidth="max-w-lg">
          {importResult.success > 0 && (
            <div className="flex items-center gap-3 rounded-xl bg-brand-50 border border-brand-200 px-4 py-3 mb-3">
              <svg className="w-5 h-5 text-brand-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm font-semibold text-brand-700">
                {importResult.success} data berhasil diimpor
              </p>
            </div>
          )}
          {importResult.errors.length > 0 && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-sm font-semibold text-red-700 mb-2">
                {importResult.errors.length} baris gagal:
              </p>
              <ul className="space-y-1 max-h-48 overflow-y-auto">
                {importResult.errors.map((e, i) => (
                  <li key={i} className="text-xs text-red-700">
                    {e.row > 0 ? `Baris ${e.row}: ` : ''}{e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {importResult.success === 0 && importResult.errors.length === 0 && (
            <p className="text-sm text-ink-muted">Tidak ada data yang diproses.</p>
          )}
          <ModalFooter>
            <BtnSave onClick={() => setImportResult(null)}>Tutup</BtnSave>
          </ModalFooter>
        </ModalShell>
      )}

      {exportOpen && (
        <ModalShell
          title="Export Data Biaya"
          subtitle="Pilih gelombang yang ingin diunduh dalam format CSV."
          onClose={() => setExportOpen(false)}
          maxWidth="max-w-lg"
        >
          <Field
            label="Gelombang"
            hint="Dropdown ini bisa dicari seperti Select2 agar lebih cepat menemukan jadwal."
            error={exportErr ?? undefined}
          >
            <SearchableSelect
              options={jadwalSelectOptions}
              value={exportJadwalId}
              onChange={(value) => {
                setExportJadwalId(value);
                setExportErr(null);
              }}
              placeholder="Cari dan pilih gelombang"
            />
          </Field>
          <ModalFooter>
            <BtnCancel onClick={() => setExportOpen(false)} />
            <BtnSave onClick={onExportCsv} loading={exporting}>
              Download CSV
            </BtnSave>
          </ModalFooter>
        </ModalShell>
      )}
    </div>
  );
}
