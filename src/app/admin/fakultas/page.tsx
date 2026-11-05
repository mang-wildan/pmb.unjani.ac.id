'use client';

import { swalSuccess, swalError, swalConfirm } from '@/lib/swal';
import { useEffect, useRef, useState } from 'react';
import PageHeader from '@/components/admin/PageHeader';
import TableLoadingRow from '@/components/admin/TableLoadingRow';
import { Field, inputClass } from '@/components/admin/Field';
import ModalShell, { ErrorAlert, ModalFooter, BtnCancel, BtnSave } from '@/components/admin/ModalShell';

type Fakultas = {
  _id: string;
  nama: string;
  singkatan: string;
  warna?: string;
  createdAt?: string;
  updatedAt?: string;
};

type ImportResult = {
  success: number;
  errors: { row: number; message: string }[];
};

const empty: Omit<Fakultas, '_id'> & { _id: string } = { _id: '', nama: '', singkatan: '', warna: '' };

const PAGE_SIZE = 10;

export default function FakultasPage() {
  const [items, setItems] = useState<Fakultas[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Fakultas | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/fakultas', { cache: 'no-store' });
    const data = await res.json();
    setItems(data.items || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { setPage(1); }, [search]);

  function openCreate() {
    setEditing({ ...empty });
    setErr(null);
  }

  function openEdit(item: Fakultas) {
    setEditing({ ...item });
    setErr(null);
  }

  async function onSave() {
    if (!editing) return;
    setSaving(true);
    setErr(null);
    const isEdit = !!editing._id;
    const res = await fetch(
      isEdit ? `/api/admin/fakultas/${editing._id}` : '/api/admin/fakultas',
      {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama: editing.nama, singkatan: editing.singkatan, warna: editing.warna || undefined }),
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
    const { isConfirmed } = await swalConfirm('Hapus Fakultas?', 'Tindakan ini tidak dapat dibatalkan.');
    if (!isConfirmed) return;
    const res = await fetch(`/api/admin/fakultas/${id}`, { method: 'DELETE' });
    if (res.ok) { swalSuccess('Berhasil Dihapus'); load(); }
    else await swalError('Gagal Menghapus');
  }

  async function onImportFile(file: File) {
    setImporting(true);
    const fd = new FormData();
    fd.set('file', file);
    const res = await fetch('/api/admin/fakultas/import', { method: 'POST', body: fd });
    const data = await res.json();
    setImporting(false);
    if (!res.ok) {
      setImportResult({ success: 0, errors: [{ row: 0, message: data.error || 'Gagal import' }] });
      return;
    }
    setImportResult(data);
    if (data.success > 0) await load();
  }

  const q = search.toLowerCase();
  const filtered = items.filter((f) =>
    f.nama.toLowerCase().includes(q) || f.singkatan.toLowerCase().includes(q),
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div>
      <PageHeader
        title="Fakultas"
        description="Kelola daftar fakultas."
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href="/api/admin/fakultas/template"
              download
              className="rounded-full border border-brand-200 px-4 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50"
            >
              ↓ Unduh Template CSV
            </a>
            <label className={`rounded-full border border-brand-200 px-4 py-2.5 text-sm font-semibold cursor-pointer transition
              ${importing ? 'opacity-60 cursor-not-allowed text-ink-muted' : 'text-brand-700 hover:bg-brand-50'}`}>
              {importing ? 'Mengimpor...' : '↑ Import CSV'}
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
              onClick={openCreate}
              className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
            >
              + Tambah Fakultas
            </button>
          </div>
        }
      />

      <div className="mb-4">
        <input
          type="search"
          placeholder="Cari nama atau singkatan fakultas..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded-full border border-brand-100 bg-white px-4 py-2 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
      </div>

      <div className="rounded-2xl bg-white border border-brand-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-brand-50/70">
            <tr>
              <th className="text-left px-5 py-3 font-semibold">Nama Fakultas</th>
              <th className="text-left px-5 py-3 font-semibold">Singkatan</th>
              <th className="text-left px-5 py-3 font-semibold">Warna</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-50">
            {loading ? (
              <TableLoadingRow colSpan={4} />
            ) : filtered.length === 0 ? (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-ink-muted">
                {search ? 'Tidak ada hasil untuk pencarian ini.' : 'Belum ada fakultas.'}
              </td></tr>
            ) : (
              pageItems.map((f) => (
                <tr key={f._id} className="hover:bg-brand-50/30">
                  <td className="px-5 py-3 font-medium text-ink">{f.nama}</td>
                  <td className="px-5 py-3 text-ink-muted font-mono">{f.singkatan}</td>
                  <td className="px-5 py-3">
                    {f.warna ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="h-5 w-5 rounded-md border border-gray-200 flex-shrink-0" style={{ backgroundColor: f.warna }} />
                        <span className="font-mono text-xs text-ink-muted">{f.warna}</span>
                      </span>
                    ) : (
                      <span className="text-xs text-ink-muted/50">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right space-x-2 whitespace-nowrap">
                    <button
                      onClick={() => openEdit(f)}
                      className="rounded-full border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(f._id)}
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
                  <span key={`e-${i}`} className="px-2 py-1.5">…</span>
                ) : (
                  <button key={n} onClick={() => setPage(n as number)} className={`rounded-full px-3 py-1.5 font-semibold transition-colors ${safePage === n ? 'bg-brand text-white' : 'hover:bg-brand-50 text-ink-muted'}`}>{n}</button>
                ),
              )}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} className="rounded-full px-3 py-1.5 font-semibold hover:bg-brand-50 disabled:opacity-30 disabled:cursor-not-allowed">›</button>
            <button onClick={() => setPage(totalPages)} disabled={safePage === totalPages} className="rounded-full px-3 py-1.5 font-semibold hover:bg-brand-50 disabled:opacity-30 disabled:cursor-not-allowed">»</button>
          </div>
        </div>
      )}

      {editing && (
        <ModalShell title={editing._id ? 'Ubah Fakultas' : 'Tambah Fakultas'} onClose={() => setEditing(null)} maxWidth="max-w-md">
          <div className="grid gap-4">
            <Field label="Nama Fakultas">
              <input
                className={inputClass}
                value={editing.nama}
                onChange={(e) => setEditing({ ...editing, nama: e.target.value })}
                placeholder="Fakultas Teknik"
              />
            </Field>
            <Field label="Singkatan">
              <input
                className={inputClass}
                value={editing.singkatan}
                onChange={(e) => setEditing({ ...editing, singkatan: e.target.value })}
                placeholder="FT"
              />
            </Field>
            <Field label="Warna">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={editing.warna || '#4f46e5'}
                  onChange={(e) => setEditing({ ...editing, warna: e.target.value })}
                  className="h-9 w-14 cursor-pointer rounded-lg border border-brand-200 p-0.5"
                />
                <input
                  type="text"
                  value={editing.warna || ''}
                  onChange={(e) => setEditing({ ...editing, warna: e.target.value })}
                  placeholder="#4f46e5"
                  maxLength={7}
                  className={inputClass}
                />
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
                {importResult.success} fakultas berhasil diimpor
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
    </div>
  );
}
