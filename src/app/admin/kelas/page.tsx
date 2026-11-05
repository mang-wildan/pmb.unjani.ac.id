'use client';

import { swalSuccess, swalError, swalConfirm } from '@/lib/swal';
import { useEffect, useState } from 'react';
import PageHeader from '@/components/admin/PageHeader';
import TableLoadingRow from '@/components/admin/TableLoadingRow';
import { Field, inputClass } from '@/components/admin/Field';
import ModalShell, { ErrorAlert, ModalFooter, BtnCancel, BtnSave } from '@/components/admin/ModalShell';

type Kelas = {
  _id: string;
  nama: string;
  singkatan: string;
};

const empty: Kelas = { _id: '', nama: '', singkatan: '' };
const PAGE_SIZE = 10;

export default function KelasPage() {
  const [items, setItems] = useState<Kelas[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Kelas | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const q = search.toLowerCase().trim();
  const filtered = q
    ? items.filter(
        (k) =>
          k.nama.toLowerCase().includes(q) ||
          k.singkatan.toLowerCase().includes(q),
      )
    : items;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/kelas', { cache: 'no-store' });
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

  function openEdit(item: Kelas) {
    setEditing({ ...item });
    setErr(null);
  }

  async function onSave() {
    if (!editing) return;
    setSaving(true);
    setErr(null);
    const isEdit = !!editing._id;
    const res = await fetch(
      isEdit ? `/api/admin/kelas/${editing._id}` : '/api/admin/kelas',
      {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama: editing.nama, singkatan: editing.singkatan }),
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
    const { isConfirmed } = await swalConfirm('Hapus Kelas?', 'Tindakan ini tidak dapat dibatalkan.');
    if (!isConfirmed) return;
    const res = await fetch(`/api/admin/kelas/${id}`, { method: 'DELETE' });
    if (res.ok) { swalSuccess('Berhasil Dihapus'); load(); }
    else await swalError('Gagal Menghapus');
  }

  return (
    <div>
      <PageHeader
        title="Kelas"
        description="Kelola daftar kelas."
        action={
          <button
            onClick={openCreate}
            className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
          >
            + Tambah Kelas
          </button>
        }
      />

      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-soft pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="search"
            placeholder="Cari nama kelas atau singkatan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-full border border-brand-200 bg-white pl-9 pr-4 py-2.5 text-sm placeholder:text-ink-soft focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand-400"
          />
        </div>
        {search && (
          <span className="text-sm text-ink-muted">
            {filtered.length} hasil ditemukan
          </span>
        )}
      </div>

      <div className="rounded-2xl bg-white border border-brand-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-brand-50/70">
            <tr>
              <th className="text-left px-5 py-3 font-semibold">Nama Kelas</th>
              <th className="text-left px-5 py-3 font-semibold">Singkatan</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-50">
            {loading ? (
              <TableLoadingRow colSpan={3} />
            ) : filtered.length === 0 ? (
              <tr><td colSpan={3} className="px-5 py-8 text-center text-ink-muted">
                {search ? `Tidak ada hasil untuk "${search}".` : 'Belum ada kelas.'}
              </td></tr>
            ) : (
              pageItems.map((k) => (
                <tr key={k._id} className="hover:bg-brand-50/30">
                  <td className="px-5 py-3 font-medium text-ink">{k.nama}</td>
                  <td className="px-5 py-3 text-ink-muted font-mono">{k.singkatan}</td>
                  <td className="px-5 py-3 text-right space-x-2 whitespace-nowrap">
                    <button
                      onClick={() => openEdit(k)}
                      className="rounded-full border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(k._id)}
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

      {!loading && filtered.length > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between gap-4 text-sm">
          <p className="text-ink-muted">
            Menampilkan <span className="font-semibold text-ink">{pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filtered.length)}</span> dari <span className="font-semibold text-ink">{filtered.length}</span> data
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="rounded-full border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Sebelumnya
            </button>
            <span className="text-ink-muted px-1">
              {safePage} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="rounded-full border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Berikutnya →
            </button>
          </div>
        </div>
      )}

      {editing && (
        <ModalShell title={editing._id ? 'Ubah Kelas' : 'Tambah Kelas'} onClose={() => setEditing(null)} maxWidth="max-w-md">
            <div className="grid gap-4">
              <Field label="Nama Kelas">
                <input
                  className={inputClass}
                  value={editing.nama}
                  onChange={(e) => setEditing({ ...editing, nama: e.target.value })}
                  placeholder="Reguler Pagi"
                />
              </Field>
              <Field label="Singkatan">
                <input
                  className={inputClass}
                  value={editing.singkatan}
                  onChange={(e) => setEditing({ ...editing, singkatan: e.target.value })}
                  placeholder="RP"
                />
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
