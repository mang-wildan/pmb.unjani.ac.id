'use client';

import { useCallback, useEffect, useState } from 'react';
import { Field, inputClass } from '@/components/admin/Field';
import ModalShell, { BtnCancel, BtnSave, ErrorAlert, ModalFooter } from '@/components/admin/ModalShell';
import PageHeader from '@/components/admin/PageHeader';
import TableLoadingRow from '@/components/admin/TableLoadingRow';
import { swalConfirm, swalError, swalSuccess } from '@/lib/swal';

type Kategori = {
  _id: string;
  nama: string;
  nama_en: string;
  slug: string;
};

const kosong: Kategori = { _id: '', nama: '', nama_en: '', slug: '' };

export default function KategoriArtikelAdminPage() {
  const [items, setItems] = useState<Kategori[]>([]);
  const [editing, setEditing] = useState<Kategori | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/kategori-artikel', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal memuat kategori');
      setItems(data.items || []);
    } catch (loadError) {
      await swalError(
        'Gagal Memuat Kategori',
        loadError instanceof Error ? loadError.message : undefined,
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function simpan() {
    if (!editing) return;
    setSaving(true);
    setError('');
    const isEdit = Boolean(editing._id);
    const response = await fetch(
      isEdit ? `/api/admin/kategori-artikel/${editing._id}` : '/api/admin/kategori-artikel',
      {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama: editing.nama,
          nama_en: editing.nama_en,
          ...(editing.slug ? { slug: editing.slug } : {}),
        }),
      },
    );
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      const rincian = Array.isArray(data.details)
        ? data.details.map((item: { message?: string }) => item.message).filter(Boolean).join('. ')
        : '';
      setError(rincian || data.error || 'Gagal menyimpan kategori');
      return;
    }
    setEditing(null);
    await swalSuccess('Kategori Berhasil Disimpan');
    await load();
  }

  async function hapus(item: Kategori) {
    const { isConfirmed } = await swalConfirm(
      'Hapus Kategori?',
      'Kategori yang masih dipakai artikel tidak dapat dihapus.',
    );
    if (!isConfirmed) return;
    const response = await fetch(`/api/admin/kategori-artikel/${item._id}`, {
      method: 'DELETE',
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      await swalError('Gagal Menghapus', data.error || 'Kategori tidak dapat dihapus');
      return;
    }
    await swalSuccess('Kategori Berhasil Dihapus');
    await load();
  }

  return (
    <div>
      <PageHeader
        title="Kategori Artikel"
        description="Kelola kategori untuk pengelompokan artikel PMB."
        action={
          <button
            onClick={() => { setEditing({ ...kosong }); setError(''); }}
            className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
          >
            + Tambah Kategori
          </button>
        }
      />

      <div className="overflow-hidden rounded-2xl border border-brand-100 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-brand-50/70">
            <tr>
              <th className="px-5 py-3 text-left font-semibold">Nama</th>
              <th className="px-5 py-3 text-left font-semibold">Nama Inggris</th>
              <th className="px-5 py-3 text-left font-semibold">Slug</th>
              <th className="px-5 py-3 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-50">
            {loading ? (
              <TableLoadingRow colSpan={4} />
            ) : items.length === 0 ? (
              <tr><td colSpan={4} className="px-5 py-10 text-center text-ink-muted">Belum ada kategori artikel.</td></tr>
            ) : items.map((item) => (
              <tr key={item._id} className="hover:bg-brand-50/30">
                <td className="px-5 py-3 font-semibold text-ink">{item.nama}</td>
                <td className="px-5 py-3 text-ink-muted">{item.nama_en || '—'}</td>
                <td className="px-5 py-3 text-ink-muted">{item.slug}</td>
                <td className="space-x-2 whitespace-nowrap px-5 py-3 text-right">
                  <button onClick={() => { setEditing({ ...item }); setError(''); }} className="rounded-full border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50">Edit</button>
                  <button onClick={() => hapus(item)} className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50">Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <ModalShell title={editing._id ? 'Ubah Kategori Artikel' : 'Tambah Kategori Artikel'} onClose={() => setEditing(null)} maxWidth="max-w-lg">
          <div className="grid gap-4">
            <Field label="Nama (ID)">
              <input className={inputClass} value={editing.nama} onChange={(event) => setEditing({ ...editing, nama: event.target.value })} placeholder="Contoh: Berita Kampus" />
            </Field>
            <Field label="Name (EN)" hint="Opsional">
              <input className={inputClass} value={editing.nama_en} onChange={(event) => setEditing({ ...editing, nama_en: event.target.value })} placeholder="Campus News" />
            </Field>
            <Field label="Slug" hint={editing._id ? 'Ubah hanya bila URL filter memang perlu diganti.' : 'Kosongkan untuk dibuat otomatis dari nama.'}>
              <input className={inputClass} value={editing.slug} onChange={(event) => setEditing({ ...editing, slug: event.target.value })} placeholder="berita-kampus" />
            </Field>
          </div>
          {error && <ErrorAlert>{error}</ErrorAlert>}
          <ModalFooter>
            <BtnCancel onClick={() => setEditing(null)} />
            <BtnSave onClick={simpan} loading={saving} />
          </ModalFooter>
        </ModalShell>
      )}
    </div>
  );
}
