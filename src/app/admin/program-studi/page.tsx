'use client';

import { swalSuccess, swalError, swalConfirm } from '@/lib/swal';
import { useEffect, useRef, useState } from 'react';
import PageHeader from '@/components/admin/PageHeader';
import TableLoadingRow from '@/components/admin/TableLoadingRow';
import { Field, inputClass, selectClass } from '@/components/admin/Field';
import ModalShell, { ErrorAlert, ModalFooter, BtnCancel, BtnSave } from '@/components/admin/ModalShell';
import SearchableSelect from '@/components/ui/SearchableSelect';

const PAGE_SIZE = 10;

type JenjangOption = { _id: string; nama: string; singkatan: string };
type FakultasOption = { _id: string; nama: string; singkatan: string };
type FileAkreditasi = { filename: string; originalName: string; ukuranByte: number };

type ProgramStudi = {
  _id: string;
  nama: string;
  singkatan: string;
  jenjang_id: string | JenjangOption;
  fakultas_id: string | FakultasOption;
  akreditasi?: string;
  persyaratan?: string[];
  fileAkreditasi?: FileAkreditasi;
};

type ImportResult = {
  success: number;
  errors: { row: number; message: string }[];
};

const empty: ProgramStudi = {
  _id: '',
  nama: '',
  singkatan: '',
  jenjang_id: '',
  fakultas_id: '',
  akreditasi: '',
  persyaratan: [],
};

function fmtSize(n: number) {
  const kb = n / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function getId(val: string | { _id: string }): string {
  return typeof val === 'object' && val !== null ? val._id : val;
}

export default function ProgramStudiPage() {
  const [items, setItems] = useState<ProgramStudi[]>([]);
  const [fakultasList, setFakultasList] = useState<FakultasOption[]>([]);
  const [jenjangList, setJenjangList] = useState<JenjangOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editing, setEditing] = useState<ProgramStudi | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadErr, setUploadErr] = useState<string | null>(null);

  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [persyaratanRaw, setPersyaratanRaw] = useState('');
  const [search, setSearch] = useState('');
  const [filterJenjangId, setFilterJenjangId] = useState('');
  const [filterFakultasId, setFilterFakultasId] = useState('');
  const [filterAkreditasi, setFilterAkreditasi] = useState('');
  const selectAllRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const [prodiRes, fkRes, jenjangRes] = await Promise.all([
      fetch('/api/admin/program-studi', { cache: 'no-store' }),
      fetch('/api/admin/fakultas', { cache: 'no-store' }),
      fetch('/api/admin/jenjang', { cache: 'no-store' }),
    ]);
    const prodiData = await prodiRes.json();
    const fkData = await fkRes.json();
    const jenjangData = await jenjangRes.json();
    const nextItems = prodiData.items || [];
    setItems(nextItems);
    setSelectedIds((prev) => prev.filter((id) => nextItems.some((item: ProgramStudi) => item._id === id)));
    setFakultasList(fkData.items || []);
    setJenjangList(jenjangData.items || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const akreditasiOptions = [...new Set(
    items.map((p) => p.akreditasi || '').filter(Boolean)
  )].sort();

  const q = search.toLowerCase();
  const hasActiveFilters = Boolean(q || filterJenjangId || filterFakultasId || filterAkreditasi);
  const filtered = items.filter((p) => {
    const jId = getId(p.jenjang_id);
    const fId = getId(p.fakultas_id);
    const jStr = typeof p.jenjang_id === 'object' && p.jenjang_id !== null
      ? p.jenjang_id.singkatan
      : (jenjangList.find((j) => j._id === p.jenjang_id)?.singkatan ?? '');
    const fStr = typeof p.fakultas_id === 'object' && p.fakultas_id !== null
      ? `${p.fakultas_id.singkatan} ${p.fakultas_id.nama}`
      : (() => { const f = fakultasList.find((fk) => fk._id === p.fakultas_id); return f ? `${f.singkatan} ${f.nama}` : ''; })();
    const matchSearch = !q || (
      p.nama.toLowerCase().includes(q) ||
      p.singkatan.toLowerCase().includes(q) ||
      jStr.toLowerCase().includes(q) ||
      fStr.toLowerCase().includes(q)
    );
    const matchJenjang = !filterJenjangId || jId === filterJenjangId;
    const matchFakultas = !filterFakultasId || fId === filterFakultasId;
    const matchAkreditasi = !filterAkreditasi || (p.akreditasi || '') === filterAkreditasi;
    return matchSearch && matchJenjang && matchFakultas && matchAkreditasi;
  });

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const activePage = Math.min(currentPage, totalPages);
  const pageStart = (activePage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(pageStart, pageStart + PAGE_SIZE);
  const pageIds = pageItems.map((item) => item._id);
  const selectedOnPageCount = pageIds.filter((id) => selectedIds.includes(id)).length;
  const allVisibleSelected = pageIds.length > 0 && selectedOnPageCount === pageIds.length;
  const showingFrom = totalItems === 0 ? 0 : pageStart + 1;
  const showingTo = totalItems === 0 ? 0 : pageStart + pageItems.length;

  useEffect(() => { setCurrentPage(1); }, [search, filterJenjangId, filterFakultasId, filterAkreditasi]);

  useEffect(() => {
    if (currentPage !== activePage) setCurrentPage(activePage);
  }, [activePage, currentPage]);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = selectedOnPageCount > 0 && !allVisibleSelected;
    }
  }, [selectedOnPageCount, allVisibleSelected]);

  function getJenjangLabel(val: string | JenjangOption): string {
    if (typeof val === 'object' && val !== null) return val.singkatan;
    const found = jenjangList.find((j) => j._id === val);
    return found ? found.singkatan : val;
  }

  function getFakultasNama(f: string | FakultasOption) {
    if (typeof f === 'object' && f !== null) return `${f.singkatan} - ${f.nama}`;
    const found = fakultasList.find((fk) => fk._id === f);
    return found ? `${found.singkatan} - ${found.nama}` : f;
  }

  function openCreate() {
    setEditing({ ...empty, jenjang_id: jenjangList[0]?._id || '', fakultas_id: fakultasList[0]?._id || '' });
    setPersyaratanRaw('');
    setErr(null);
  }

  function openEdit(item: ProgramStudi) {
    setEditing({ ...item, jenjang_id: getId(item.jenjang_id), fakultas_id: getId(item.fakultas_id) });
    setPersyaratanRaw((item.persyaratan || []).join('\n'));
    setErr(null);
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]));
  }

  function toggleSelectAllVisible(checked: boolean) {
    if (checked) {
      setSelectedIds((prev) => [...new Set([...prev, ...pageIds])]);
      return;
    }
    setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
  }

  async function onSave() {
    if (!editing) return;
    setSaving(true);
    setErr(null);
    const isEdit = !!editing._id;
    const payload = {
      nama: editing.nama,
      singkatan: editing.singkatan,
      jenjang_id: getId(editing.jenjang_id),
      fakultas_id: getId(editing.fakultas_id),
      akreditasi: editing.akreditasi || '',
      persyaratan: persyaratanRaw.split('\n').map((l) => l.trim()).filter(Boolean),
    };
    const res = await fetch(
      isEdit ? `/api/admin/program-studi/${editing._id}` : '/api/admin/program-studi',
      {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setErr(data.error || 'Gagal menyimpan');
      return;
    }
    setEditing(null);
    setPersyaratanRaw('');
    swalSuccess('Berhasil Disimpan');
    await load();
  }

  async function onDelete(id: string) {
    const { isConfirmed } = await swalConfirm('Hapus Program Studi?', 'Tindakan ini tidak dapat dibatalkan.');
    if (!isConfirmed) return;
    const res = await fetch(`/api/admin/program-studi/${id}`, { method: 'DELETE' });
    if (res.ok) { swalSuccess('Berhasil Dihapus'); await load(); }
    else await swalError('Gagal Menghapus');
  }

  async function onBulkDelete() {
    if (selectedIds.length === 0) return;
    const { isConfirmed } = await swalConfirm(`Hapus ${selectedIds.length} Program Studi?`, 'Tindakan ini tidak dapat dibatalkan.');
    if (!isConfirmed) return;
    setBulkDeleting(true);
    const res = await fetch('/api/admin/program-studi', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: selectedIds }),
    });
    const data = await res.json().catch(() => null);
    setBulkDeleting(false);
    if (!res.ok) {
      await swalError('Gagal Menghapus', data?.error || 'Gagal menghapus program studi terpilih');
      return;
    }
    setSelectedIds([]);
    swalSuccess('Berhasil Dihapus');
    await load();
  }

  async function onUploadFile(id: string, file: File) {
    setUploadingId(id);
    setUploadErr(null);
    const fd = new FormData();
    fd.set('file', file);
    const res = await fetch(`/api/admin/program-studi/${id}/akreditasi`, { method: 'POST', body: fd });
    const data = await res.json();
    setUploadingId(null);
    if (!res.ok) {
      setUploadErr(data.error || 'Gagal unggah');
      return;
    }
    await load();
  }

  async function onDeleteFile(id: string) {
    const { isConfirmed } = await swalConfirm('Hapus File Akreditasi?', 'Tindakan ini tidak dapat dibatalkan.');
    if (!isConfirmed) return;
    const res = await fetch(`/api/admin/program-studi/${id}/akreditasi`, { method: 'DELETE' });
    if (res.ok) { swalSuccess('Berhasil Dihapus'); await load(); }
    else await swalError('Gagal Menghapus');
  }

  async function onImportFile(file: File) {
    setImporting(true);
    const fd = new FormData();
    fd.set('file', file);
    const res = await fetch('/api/admin/program-studi/import', { method: 'POST', body: fd });
    const data = await res.json();
    setImporting(false);
    if (!res.ok) {
      setImportResult({ success: 0, errors: [{ row: 0, message: data.error || 'Gagal import' }] });
      return;
    }
    setImportResult(data);
    if (data.success > 0) await load();
  }

  async function onExport() {
    setExporting(true);
    const res = await fetch('/api/admin/program-studi/export');
    if (!res.ok) { await swalError('Gagal Export', 'Gagal mengunduh data CSV'); setExporting(false); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'export-program-studi.csv';
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
  }

  return (
    <div>
      <PageHeader
        title="Program Studi"
        description="Kelola daftar program studi."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/api/admin/program-studi/template"
              download
              className="rounded-full border border-brand-200 px-4 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50"
            >
              Unduh Template CSV
            </a>
            <label
              className={`cursor-pointer rounded-full border border-brand-200 px-4 py-2.5 text-sm font-semibold transition ${
                importing ? 'cursor-not-allowed text-ink-muted opacity-60' : 'text-brand-700 hover:bg-brand-50'
              }`}
            >
              {importing ? 'Mengimpor...' : 'Import CSV'}
              <input
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
              onClick={onExport}
              disabled={exporting}
              className={`rounded-full border border-brand-200 px-4 py-2.5 text-sm font-semibold transition ${
                exporting ? 'cursor-not-allowed text-ink-muted opacity-60' : 'text-brand-700 hover:bg-brand-50'
              }`}
            >
              {exporting ? 'Mengekspor...' : 'Export CSV'}
            </button>
            <button
              onClick={onBulkDelete}
              disabled={selectedIds.length === 0 || bulkDeleting}
              className="rounded-full border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {bulkDeleting ? 'Menghapus...' : `Hapus Terpilih${selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}`}
            </button>
            <button
              onClick={openCreate}
              className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
            >
              + Tambah Program Studi
            </button>
          </div>
        }
      />

      {uploadErr && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {uploadErr}
        </div>
      )}

      <div className="mb-4 rounded-2xl border border-brand-100 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-ink">Filter Data</h2>
            <p className="text-xs text-ink-muted">Saring program studi berdasarkan jenjang, akreditasi, dan fakultas.</p>
          </div>
          <div className="flex items-center gap-3 text-sm text-ink-muted">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => { setSearch(''); setFilterJenjangId(''); setFilterFakultasId(''); setFilterAkreditasi(''); }}
                className="rounded-full border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50"
              >
                Reset Filter
              </button>
            )}
            <span>{filtered.length} hasil ditemukan</span>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 items-end">
          <Field label="Cari">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-soft pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input
                type="search"
                placeholder="Nama, singkatan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-full border border-brand-200 bg-white pl-9 pr-4 py-2.5 text-sm placeholder:text-ink-soft focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand-400"
              />
            </div>
          </Field>
          <Field label="Jenjang">
            <SearchableSelect
              searchable={false}
              rounded="full"
              options={jenjangList.map((j) => ({ value: j._id, label: `${j.singkatan} — ${j.nama}` }))}
              value={filterJenjangId}
              placeholder="Semua Jenjang"
              onChange={setFilterJenjangId}
            />
          </Field>
          <Field label="Akreditasi">
            <SearchableSelect
              searchable={false}
              rounded="full"
              options={akreditasiOptions.map((a) => ({ value: a, label: a }))}
              value={filterAkreditasi}
              placeholder="Semua Akreditasi"
              onChange={setFilterAkreditasi}
            />
          </Field>
          <Field label="Fakultas">
            <SearchableSelect
              searchable={false}
              rounded="full"
              options={fakultasList.map((f) => ({ value: f._id, label: `${f.singkatan} — ${f.nama}` }))}
              value={filterFakultasId}
              placeholder="Semua Fakultas"
              onChange={setFilterFakultasId}
            />
          </Field>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-brand-100 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-brand-50/70">
            <tr>
              <th className="px-5 py-3">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  aria-label="Pilih semua program studi di halaman ini"
                  checked={allVisibleSelected}
                  onChange={(e) => toggleSelectAllVisible(e.target.checked)}
                  className="h-4 w-4 rounded border-brand-200 text-brand focus:ring-brand/30"
                />
              </th>
              <th className="px-5 py-3 text-left font-semibold">Nama Program Studi</th>
              <th className="px-5 py-3 text-left font-semibold">Singkatan</th>
              <th className="px-5 py-3 text-left font-semibold">Jenjang</th>
              <th className="px-5 py-3 text-left font-semibold">Fakultas</th>
              <th className="px-5 py-3 text-left font-semibold">Akreditasi</th>
              <th className="px-5 py-3 text-left font-semibold">File Akreditasi</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-50">
            {loading ? (
              <TableLoadingRow colSpan={8} />
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-center text-ink-muted">
                  {search ? 'Tidak ada hasil untuk pencarian ini.' : 'Belum ada program studi.'}
                </td>
              </tr>
            ) : (
              pageItems.map((p) => (
                <tr key={p._id} className="hover:bg-brand-50/30">
                  <td className="px-5 py-3">
                    <input
                      type="checkbox"
                      aria-label={`Pilih ${p.nama}`}
                      checked={selectedIds.includes(p._id)}
                      onChange={() => toggleSelected(p._id)}
                      className="h-4 w-4 rounded border-brand-200 text-brand focus:ring-brand/30"
                    />
                  </td>
                  <td className="px-5 py-3 font-medium text-ink">{p.nama}</td>
                  <td className="px-5 py-3 font-mono text-ink-muted">{p.singkatan}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                      {getJenjangLabel(p.jenjang_id)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-ink-muted">{getFakultasNama(p.fakultas_id)}</td>
                  <td className="px-5 py-3 text-ink-muted">
                    {p.akreditasi ? (
                      <span className="inline-flex rounded-full bg-accent-50 px-3 py-1 text-xs font-bold text-accent-700">
                        {p.akreditasi}
                      </span>
                    ) : (
                      <span className="text-xs text-ink-muted/50">-</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {p.fileAkreditasi?.filename ? (
                      <div className="flex items-center gap-2">
                        <a
                          href={`/api/program-studi/${p._id}/akreditasi`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-brand-700 hover:underline"
                        >
                          {p.fileAkreditasi.originalName || 'PDF'}
                          <span className="ml-1 text-ink-muted">({fmtSize(p.fileAkreditasi.ukuranByte)})</span>
                        </a>
                        <button
                          onClick={() => onDeleteFile(p._id)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Hapus
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <span className="text-xs text-brand-700 hover:underline">
                          {uploadingId === p._id ? 'Mengunggah...' : '+ Unggah PDF'}
                        </span>
                        <input
                          type="file"
                          accept="application/pdf"
                          className="sr-only"
                          disabled={uploadingId === p._id}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) onUploadFile(p._id, f);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    )}
                  </td>
                  <td className="space-x-2 whitespace-nowrap px-5 py-3 text-right">
                    <button
                      onClick={() => openEdit(p)}
                      className="rounded-full border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(p._id)}
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
        <div className="flex flex-col gap-3 border-t border-brand-50 px-5 py-4 text-sm md:flex-row md:items-center md:justify-between">
          <p className="text-ink-muted">
            Menampilkan {showingFrom}–{showingTo} dari {totalItems} program studi
            {search && items.length !== totalItems && ` (filter dari ${items.length})`}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-ink-muted">Halaman {activePage} / {totalPages}</span>
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={loading || activePage === 1}
              className="rounded-full border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Sebelumnya
            </button>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={loading || activePage === totalPages}
              className="rounded-full border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Berikutnya
            </button>
          </div>
        </div>
      </div>

      {editing && (
        <ModalShell title={editing._id ? 'Ubah Program Studi' : 'Tambah Program Studi'} onClose={() => setEditing(null)}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nama Program Studi" className="md:col-span-2">
              <input
                className={inputClass}
                value={editing.nama}
                onChange={(e) => setEditing({ ...editing, nama: e.target.value })}
                placeholder="Teknik Informatika"
              />
            </Field>
            <Field label="Singkatan">
              <input
                className={inputClass}
                value={editing.singkatan}
                onChange={(e) => setEditing({ ...editing, singkatan: e.target.value })}
                placeholder="TI"
              />
            </Field>
            <Field label="Jenjang">
              <select
                className={selectClass}
                value={getId(editing.jenjang_id)}
                onChange={(e) => setEditing({ ...editing, jenjang_id: e.target.value })}
              >
                <option value="">- Pilih Jenjang -</option>
                {jenjangList.map((j) => (
                  <option key={j._id} value={j._id}>
                    {j.singkatan} — {j.nama}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Fakultas" className="md:col-span-2">
              <select
                className={selectClass}
                value={getId(editing.fakultas_id)}
                onChange={(e) => setEditing({ ...editing, fakultas_id: e.target.value })}
              >
                <option value="">- Pilih Fakultas -</option>
                {fakultasList.map((f) => (
                  <option key={f._id} value={f._id}>
                    {f.singkatan} - {f.nama}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Akreditasi" className="md:col-span-2" hint="Contoh: Unggul, A, B">
              <input
                className={inputClass}
                value={editing.akreditasi || ''}
                onChange={(e) => setEditing({ ...editing, akreditasi: e.target.value })}
                placeholder="Unggul"
              />
            </Field>
            <Field label="Persyaratan" className="md:col-span-2" hint="Satu persyaratan per baris">
              <textarea
                className={inputClass + ' min-h-[100px] resize-y'}
                value={persyaratanRaw}
                onChange={(e) => setPersyaratanRaw(e.target.value)}
                placeholder={'Ijazah SMA/sederajat\nSKHUN\nFoto 3x4'}
                rows={4}
              />
            </Field>
          </div>
          {err && <ErrorAlert>{err}</ErrorAlert>}
          <ModalFooter>
            <BtnCancel onClick={() => { setEditing(null); setPersyaratanRaw(''); }} />
            <BtnSave onClick={onSave} loading={saving} />
          </ModalFooter>
        </ModalShell>
      )}

      {importResult && (
        <ModalShell title="Hasil Import CSV" onClose={() => setImportResult(null)} maxWidth="max-w-lg">
          {importResult.success > 0 && (
            <div className="mb-3 flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3">
              <svg className="w-5 h-5 text-brand-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm font-semibold text-brand-700">
                {importResult.success} program studi berhasil diimpor
              </p>
            </div>
          )}
          {importResult.errors.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="mb-2 text-sm font-semibold text-red-700">
                {importResult.errors.length} baris gagal:
              </p>
              <ul className="max-h-48 space-y-1 overflow-y-auto">
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
    </div>
  );
}
