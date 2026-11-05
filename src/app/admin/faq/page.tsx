'use client';

import { swalSuccess, swalError, swalConfirm } from '@/lib/swal';
import { useEffect, useState } from 'react';
import PageHeader from '@/components/admin/PageHeader';
import TableLoadingRow from '@/components/admin/TableLoadingRow';
import { Field, inputClass, selectClass, textareaClass } from '@/components/admin/Field';
import ModalShell, { ErrorAlert, ModalFooter, BtnCancel, BtnSave } from '@/components/admin/ModalShell';
import SearchableSelect from '@/components/ui/SearchableSelect';

type FAQ = {
  _id: string;
  pertanyaan: string;
  jawaban: string;
  pertanyaan_en: string;
  jawaban_en: string;
  kategori: 'Teknis' | 'Biaya' | 'Jadwal';
  urutan: number;
  aktif: boolean;
};

const empty: FAQ = {
  _id: '',
  pertanyaan: '',
  jawaban: '',
  pertanyaan_en: '',
  jawaban_en: '',
  kategori: 'Teknis',
  urutan: 100,
  aktif: true,
};

const kategoriList = ['Teknis', 'Biaya', 'Jadwal'] as const;

const PAGE_SIZE = 10;

export default function FAQAdminPage() {
  const [items, setItems] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<FAQ | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterKategori, setFilterKategori] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/faq', { cache: 'no-store' });
    const data = await res.json();
    setItems(data.items || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { setPage(1); }, [search, filterKategori, filterStatus]);

  async function onSave() {
    if (!editing) return;
    setSaving(true);
    setErr(null);
    const isEdit = !!editing._id;
    const payload = { ...editing, urutan: Number(editing.urutan) };
    const res = await fetch(
      isEdit ? `/api/admin/faq/${editing._id}` : '/api/admin/faq',
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
    swalSuccess('Berhasil Disimpan');
    load();
  }

  async function onDelete(id: string) {
    const { isConfirmed } = await swalConfirm('Hapus FAQ?', 'Tindakan ini tidak dapat dibatalkan.');
    if (!isConfirmed) return;
    const res = await fetch(`/api/admin/faq/${id}`, { method: 'DELETE' });
    if (res.ok) { swalSuccess('Berhasil Dihapus'); load(); }
    else await swalError('Gagal Menghapus');
  }

  const q = search.toLowerCase();
  const hasActiveFilters = Boolean(q || filterKategori || filterStatus);
  const filtered = items.filter((f) => {
    const matchSearch = !q || f.pertanyaan.toLowerCase().includes(q) || f.kategori.toLowerCase().includes(q);
    const matchKategori = !filterKategori || f.kategori === filterKategori;
    const matchStatus = !filterStatus || (filterStatus === 'aktif' ? f.aktif : !f.aktif);
    return matchSearch && matchKategori && matchStatus;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div>
      <PageHeader
        title="FAQ"
        description="Kelola pertanyaan yang sering diajukan, dibagi per kategori Teknis, Biaya, dan Jadwal."
        action={
          <button
            onClick={() => {
              setEditing({ ...empty });
              setErr(null);
            }}
            className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
          >
            + Tambah FAQ
          </button>
        }
      />

      <div className="mb-4 rounded-2xl border border-brand-100 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-ink">Filter Data</h2>
            <p className="text-xs text-ink-muted">Saring FAQ berdasarkan kategori dan status.</p>
          </div>
          <div className="flex items-center gap-3 text-sm text-ink-muted">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => { setSearch(''); setFilterKategori(''); setFilterStatus(''); }}
                className="rounded-full border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50"
              >
                Reset Filter
              </button>
            )}
            <span>{filtered.length} hasil ditemukan</span>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 items-end">
          <Field label="Cari">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-soft pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input
                type="search"
                placeholder="Cari pertanyaan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-full border border-brand-200 bg-white pl-9 pr-4 py-2.5 text-sm placeholder:text-ink-soft focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand-400"
              />
            </div>
          </Field>
          <Field label="Kategori">
            <SearchableSelect
              searchable={false}
              rounded="full"
              value={filterKategori}
              onChange={setFilterKategori}
              placeholder="Semua Kategori"
              options={[
                { value: 'Teknis', label: 'Teknis', dotColor: 'bg-brand' },
                { value: 'Biaya',  label: 'Biaya',  dotColor: 'bg-accent-500' },
                { value: 'Jadwal', label: 'Jadwal', dotColor: 'bg-blue-500' },
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
              <th className="text-left px-5 py-3 font-semibold whitespace-nowrap">No.</th>
              <th className="text-left px-5 py-3 font-semibold">Pertanyaan</th>
              <th className="text-left px-5 py-3 font-semibold">Kategori</th>
              <th className="text-left px-5 py-3 font-semibold">Urutan</th>
              <th className="text-left px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 whitespace-nowrap">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-50">
            {loading ? (
              <TableLoadingRow colSpan={6} />
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-ink-muted">
                  {search ? 'Tidak ada hasil untuk pencarian ini.' : 'Belum ada FAQ. Klik "+ Tambah FAQ" untuk mulai.'}
                </td>
              </tr>
            ) : (
              pageItems.map((f, index) => (
                <tr key={f._id} className="hover:bg-brand-50/30">
                  <td className="px-5 py-3 text-ink-muted whitespace-nowrap">{(safePage - 1) * PAGE_SIZE + index + 1}</td>
                  <td className="px-5 py-3 font-medium text-ink max-w-sm">
                    <span className="line-clamp-2">{f.pertanyaan}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                      {f.kategori}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-ink-muted">{f.urutan}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        f.aktif ? 'bg-brand-50 text-brand-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {f.aktif ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right space-x-2 whitespace-nowrap">
                    <button
                      onClick={() => {
                        setEditing({ ...f });
                        setErr(null);
                      }}
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

      {editing && (
        <ModalShell title={editing._id ? 'Ubah FAQ' : 'Tambah FAQ'} onClose={() => setEditing(null)}>
            <div className="grid gap-4">
              <Field label="Kategori">
                <select
                  className={selectClass}
                  value={editing.kategori}
                  onChange={(e) =>
                    setEditing({ ...editing, kategori: e.target.value as FAQ['kategori'] })
                  }
                >
                  {kategoriList.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Pertanyaan (ID)">
                <input
                  className={inputClass}
                  value={editing.pertanyaan}
                  onChange={(e) => setEditing({ ...editing, pertanyaan: e.target.value })}
                  placeholder="Tulis pertanyaan..."
                />
              </Field>
              <Field label="Jawaban (ID)">
                <textarea
                  className={textareaClass}
                  rows={5}
                  value={editing.jawaban}
                  onChange={(e) => setEditing({ ...editing, jawaban: e.target.value })}
                  placeholder="Tulis jawaban lengkap..."
                />
              </Field>
              <Field label="Question (EN)" hint="Optional English translation">
                <input
                  className={inputClass}
                  value={editing.pertanyaan_en}
                  onChange={(e) => setEditing({ ...editing, pertanyaan_en: e.target.value })}
                  placeholder="English question..."
                />
              </Field>
              <Field label="Answer (EN)" hint="Optional English translation">
                <textarea
                  className={textareaClass}
                  rows={5}
                  value={editing.jawaban_en}
                  onChange={(e) => setEditing({ ...editing, jawaban_en: e.target.value })}
                  placeholder="English answer..."
                />
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
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
