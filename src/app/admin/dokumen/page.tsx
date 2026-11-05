'use client';

import { swalSuccess, swalError, swalConfirm } from '@/lib/swal';
import React, { useEffect, useState } from 'react';
import PageHeader from '@/components/admin/PageHeader';
import TableLoadingRow from '@/components/admin/TableLoadingRow';
import { Field, inputClass, selectClass, textareaClass } from '@/components/admin/Field';
import ModalShell, { ErrorAlert, ModalFooter, BtnCancel, BtnSave } from '@/components/admin/ModalShell';
import SearchableSelect from '@/components/ui/SearchableSelect';

type Dok = {
  _id: string;
  kategori: 'biaya' | 'manual-book' | 'lainnya';
  tahun?: string;
  judul: string;
  judul_en?: string;
  deskripsi?: string;
  filename: string;
  originalName: string;
  ukuranByte: number;
  urutan: number;
  aktif: boolean;
  updatedAt?: string;
};

function fmtSize(n: number) {
  const kb = n / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

const PAGE_SIZE = 10;

const KATEGORI_CFG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  biaya: {
    label: 'Biaya',
    color: 'bg-brand-50 text-brand-700',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="10" /><path d="M12 6v2m0 8v2M9.5 9.5A2.5 2.5 0 0 1 12 8h.5a2.5 2.5 0 0 1 0 5h-1a2.5 2.5 0 0 0 0 5h.5a2.5 2.5 0 0 0 2.5-1.5" />
      </svg>
    ),
  },
  'manual-book': {
    label: 'Buku Panduan',
    color: 'bg-blue-50 text-blue-700',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
  },
  lainnya: {
    label: 'Lainnya',
    color: 'bg-gray-100 text-gray-600',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" />
      </svg>
    ),
  },
};

export default function DokumenAdminPage() {
  const [items, setItems] = useState<Dok[]>([]);
  const [filter, setFilter] = useState<'all' | Dok['kategori']>('all');
  const [filterTahun, setFilterTahun] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<Dok | null>(null);

  const [form, setForm] = useState({
    kategori: 'biaya' as Dok['kategori'],
    tahun: String(new Date().getFullYear()),
    judul: '',
    deskripsi: '',
    urutan: 100,
    aktif: true,
    file: null as File | null,
  });

  async function load() {
    setLoading(true);
    const q = filter === 'all' ? '' : `?kategori=${filter}`;
    const res = await fetch(`/api/admin/dokumen${q}`, { cache: 'no-store' });
    const data = await res.json();
    setItems(data.items || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [filter]);
  useEffect(() => { setPage(1); }, [search, filter, filterTahun, filterStatus]);

  async function onUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!form.file) {
      setUploadErr('Pilih file PDF');
      return;
    }
    setUploading(true);
    setUploadErr(null);
    const fd = new FormData();
    fd.set('file', form.file);
    fd.set('kategori', form.kategori);
    fd.set('tahun', form.tahun);
    fd.set('judul', form.judul);
    fd.set('deskripsi', form.deskripsi);
    fd.set('urutan', String(form.urutan));
    fd.set('aktif', form.aktif ? 'true' : 'false');
    const res = await fetch('/api/admin/dokumen/upload', { method: 'POST', body: fd });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) {
      setUploadErr(data.error || 'Gagal unggah');
      return;
    }
    setUploadOpen(false);
    setForm({ kategori: 'biaya', tahun: String(new Date().getFullYear()), judul: '', deskripsi: '', urutan: 100, aktif: true, file: null });
    swalSuccess('Berhasil Diunggah');
    load();
  }

  async function onEditSave() {
    if (!editing) return;
    const res = await fetch(`/api/admin/dokumen/${editing._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kategori: editing.kategori,
        tahun: editing.tahun || '',
        judul: editing.judul,
        deskripsi: editing.deskripsi,
        urutan: Number(editing.urutan),
        aktif: editing.aktif,
      }),
    });
    if (!res.ok) {
      await swalError('Gagal Menyimpan');
      return;
    }
    setEditing(null);
    swalSuccess('Berhasil Disimpan');
    load();
  }

  async function toggleAktif(d: Dok) {
    await fetch(`/api/admin/dokumen/${d._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aktif: !d.aktif }),
    });
    load();
  }

  async function onDelete(id: string) {
    const { isConfirmed } = await swalConfirm('Hapus Dokumen?', 'File PDF juga akan dihapus permanen.');
    if (!isConfirmed) return;
    const res = await fetch(`/api/admin/dokumen/${id}`, { method: 'DELETE' });
    if (res.ok) { swalSuccess('Berhasil Dihapus'); load(); }
    else await swalError('Gagal Menghapus');
  }

  const tahunOptions = Array.from(new Set(items.map((d) => d.tahun || '').filter(Boolean))).sort((a, b) => b.localeCompare(a));
  const q = search.toLowerCase();
  const hasActiveFilters = Boolean(q || filter !== 'all' || filterTahun || filterStatus);
  const filtered = items.filter((d) => {
    const matchSearch =
      !q ||
      d.judul.toLowerCase().includes(q) ||
      d.originalName.toLowerCase().includes(q) ||
      (d.tahun || '').toLowerCase().includes(q);
    const matchTahun = !filterTahun || (d.tahun || '') === filterTahun;
    const matchStatus = !filterStatus || (filterStatus === 'aktif' ? d.aktif : !d.aktif);
    return matchSearch && matchTahun && matchStatus;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div>
      <PageHeader
        title="Dokumen PDF"
        description="Kelola PDF Biaya Pendidikan, Buku Panduan, dan dokumen lainnya."
        action={
          <button
            onClick={() => setUploadOpen(true)}
            className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
          >
            + Unggah PDF
          </button>
        }
      />

      <div className="mb-4 rounded-2xl border border-brand-100 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-ink">Filter Data</h2>
            <p className="text-xs text-ink-muted">Saring dokumen berdasarkan tahun, kategori, dan status.</p>
          </div>
          <div className="flex items-center gap-3 text-sm text-ink-muted">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => { setSearch(''); setFilter('all'); setFilterTahun(''); setFilterStatus(''); }}
                className="rounded-full border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50"
              >
                Reset Filter
              </button>
            )}
            <span>{filtered.length} hasil ditemukan</span>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-4 items-end">
          <Field label="Cari">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-soft pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input
                type="search"
                placeholder="Judul atau nama file..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-full border border-brand-200 bg-white pl-9 pr-4 py-2.5 text-sm placeholder:text-ink-soft focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand-400"
              />
            </div>
          </Field>
          <Field label="Tahun">
            <SearchableSelect
              searchable={false}
              rounded="full"
              value={filterTahun}
              onChange={setFilterTahun}
              placeholder="Semua Tahun"
              options={tahunOptions.map((tahun) => ({
                value: tahun,
                label: tahun,
                dotColor: 'bg-amber-500',
              }))}
            />
          </Field>
          <Field label="Kategori">
            <SearchableSelect
              searchable={false}
              rounded="full"
              value={filter}
              onChange={(v) => setFilter(v as any)}
              placeholder="Semua Kategori"
              options={[
                { value: 'all',         label: 'Semua Kategori',  dotColor: 'bg-ink-soft' },
                { value: 'biaya',       label: 'Biaya',           dotColor: 'bg-brand' },
                { value: 'manual-book', label: 'Buku Panduan',    dotColor: 'bg-blue-500' },
                { value: 'lainnya',     label: 'Lainnya',         dotColor: 'bg-gray-400' },
              ]}
            />
          </Field>
          <Field label="Status">
            <SearchableSelect
              searchable={false}
              rounded="full"
              value={filterStatus}
              onChange={setFilterStatus}
              placeholder="Semua Status"
              options={[
                { value: 'aktif',    label: 'Aktif',    dotColor: 'bg-brand' },
                { value: 'nonaktif', label: 'Nonaktif', dotColor: 'bg-gray-400' },
              ]}
            />
          </Field>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-brand-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-brand-50/70">
            <tr>
              <th className="text-left px-5 py-3 font-semibold">No.</th>
              <th className="text-left px-5 py-3 font-semibold">Judul</th>
              <th className="text-left px-5 py-3 font-semibold">Tahun</th>
              <th className="text-left px-5 py-3 font-semibold">Kategori</th>
              <th className="text-left px-5 py-3 font-semibold">File</th>
              <th className="text-left px-5 py-3 font-semibold">Ukuran</th>
              <th className="text-left px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-50">
            {loading ? (
              <TableLoadingRow colSpan={8} />
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-center text-ink-muted">
                  {search ? 'Tidak ada hasil untuk pencarian ini.' : 'Belum ada dokumen.'}
                </td>
              </tr>
            ) : (
              pageItems.map((d, index) => (
                <tr key={d._id} className="hover:bg-brand-50/30">
                  <td className="px-5 py-3 text-ink-muted whitespace-nowrap">{(safePage - 1) * PAGE_SIZE + index + 1}</td>
                  <td className="px-5 py-3 font-medium text-ink">{d.judul}</td>
                  <td className="px-5 py-3 text-ink-muted whitespace-nowrap">{d.tahun || '—'}</td>
                  <td className="px-5 py-3">
                    {(() => {
                      const cfg = KATEGORI_CFG[d.kategori] ?? KATEGORI_CFG.lainnya;
                      return (
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${cfg.color}`}>
                          {cfg.icon}
                          {cfg.label}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-5 py-3">
                    <a
                      href={`/api/files/${d._id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={d.originalName}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                        <polyline points="14 2 14 8 20 8" />
                        <path d="M9 13h1m4 0h1M9 17h6" />
                      </svg>
                      <span className="sr-only">{d.originalName}</span>
                    </a>
                  </td>
                  <td className="px-5 py-3 text-ink-muted">{fmtSize(d.ukuranByte)}</td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => toggleAktif(d)}
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                        d.aktif
                          ? 'bg-brand-50 text-brand-700 hover:bg-brand-100'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {d.aktif ? 'Aktif' : 'Nonaktif'}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-right space-x-2 whitespace-nowrap">
                    <button
                      onClick={() => setEditing({ ...d })}
                      className="rounded-full border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(d._id)}
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

      {uploadOpen && (
        <ModalShell title="Unggah Dokumen PDF" onClose={() => setUploadOpen(false)}>
          <form onSubmit={onUpload}>
            <div className="grid gap-4">
              <Field label="Kategori">
                <select
                  className={selectClass}
                  value={form.kategori}
                  onChange={(e) => setForm({ ...form, kategori: e.target.value as any })}
                >
                  <option value="biaya">Biaya Pendidikan</option>
                  <option value="manual-book">Buku Panduan</option>
                  <option value="lainnya">Lainnya</option>
                </select>
              </Field>
              <Field label="Judul">
                <input
                  className={inputClass}
                  value={form.judul}
                  onChange={(e) => setForm({ ...form, judul: e.target.value })}
                  required
                />
              </Field>
              <Field label="Tahun">
                <input
                  className={inputClass}
                  value={form.tahun}
                  onChange={(e) => setForm({ ...form, tahun: e.target.value })}
                  placeholder="2026"
                  required
                />
              </Field>
              <Field label="Deskripsi">
                <textarea
                  className={textareaClass}
                  value={form.deskripsi}
                  onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
                />
              </Field>
              <Field label="File PDF (maks 15 MB)">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })}
                  className="block w-full text-sm text-ink file:mr-4 file:rounded-full file:border-0 file:bg-brand-50 file:text-brand-700 file:font-semibold file:px-4 file:py-2"
                  required
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Urutan">
                  <input
                    type="number"
                    className={inputClass}
                    value={form.urutan}
                    onChange={(e) => setForm({ ...form, urutan: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Status">
                  <select
                    className={selectClass}
                    value={form.aktif ? '1' : '0'}
                    onChange={(e) => setForm({ ...form, aktif: e.target.value === '1' })}
                  >
                    <option value="1">Aktif</option>
                    <option value="0">Nonaktif</option>
                  </select>
                </Field>
              </div>
            </div>
            {uploadErr && <ErrorAlert>{uploadErr}</ErrorAlert>}
            <ModalFooter>
              <BtnCancel onClick={() => setUploadOpen(false)} />
              <BtnSave type="submit" loading={uploading}>Unggah</BtnSave>
            </ModalFooter>
          </form>
        </ModalShell>
      )}

      {editing && (
        <ModalShell title="Ubah Dokumen" subtitle="File tidak dapat diganti. Hapus & unggah ulang bila perlu." onClose={() => setEditing(null)}>
          <div className="grid gap-4">
            <Field label="Kategori">
              <select
                className={selectClass}
                value={editing.kategori}
                onChange={(e) => setEditing({ ...editing, kategori: e.target.value as Dok['kategori'] })}
              >
                <option value="biaya">Biaya Pendidikan</option>
                <option value="manual-book">Buku Panduan</option>
                <option value="lainnya">Lainnya</option>
              </select>
            </Field>
            <Field label="Judul (ID)">
              <input
                className={inputClass}
                value={editing.judul}
                onChange={(e) => setEditing({ ...editing, judul: e.target.value })}
              />
            </Field>
            <Field label="Tahun">
              <input
                className={inputClass}
                value={editing.tahun || ''}
                onChange={(e) => setEditing({ ...editing, tahun: e.target.value })}
                placeholder="2026"
              />
            </Field>
            <Field label="Title (EN)" hint="Optional English translation">
              <input
                className={inputClass}
                value={editing.judul_en || ''}
                onChange={(e) => setEditing({ ...editing, judul_en: e.target.value })}
                placeholder="English title..."
              />
            </Field>
            <Field label="Deskripsi">
              <textarea
                className={textareaClass}
                value={editing.deskripsi || ''}
                onChange={(e) => setEditing({ ...editing, deskripsi: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Urutan">
                <input
                  type="number"
                  className={inputClass}
                  value={editing.urutan}
                  onChange={(e) => setEditing({ ...editing, urutan: Number(e.target.value) })}
                />
              </Field>
              <Field label="Status">
                <select
                  className={selectClass}
                  value={editing.aktif ? '1' : '0'}
                  onChange={(e) => setEditing({ ...editing, aktif: e.target.value === '1' })}
                >
                  <option value="1">Aktif</option>
                  <option value="0">Nonaktif</option>
                </select>
              </Field>
            </div>
          </div>
          <ModalFooter>
            <BtnCancel onClick={() => setEditing(null)} />
            <BtnSave onClick={onEditSave} />
          </ModalFooter>
        </ModalShell>
      )}
    </div>
  );
}
