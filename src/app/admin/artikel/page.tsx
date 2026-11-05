'use client';

import { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';
import { Field } from '@/components/admin/Field';
import PageHeader from '@/components/admin/PageHeader';
import TableLoadingRow from '@/components/admin/TableLoadingRow';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { swalConfirm, swalError, swalSuccess } from '@/lib/swal';

type Artikel = {
  _id: string;
  judul: string;
  slug: string;
  status: 'draft' | 'terjadwal' | 'terbit' | 'arsip';
  pinned: boolean;
  publishedAt?: string | null;
  deletedAt?: string | null;
  kategori_id?: { nama?: string } | null;
  createdBy?: { _id?: string; nama?: string } | string | null;
};

type User = { id: string; role: 'editor' | 'admin' | 'superadmin' };

const STATUS = {
  draft: { label: 'Draft', kelas: 'bg-gray-100 text-gray-600' },
  terjadwal: { label: 'Terjadwal', kelas: 'bg-blue-50 text-blue-700' },
  terbit: { label: 'Terbit', kelas: 'bg-brand-50 text-brand-700' },
  arsip: { label: 'Arsip', kelas: 'bg-amber-50 text-amber-700' },
};

export default function ArtikelAdminPage() {
  const router = useRouter();
  const [items, setItems] = useState<Artikel[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState('');
  const [terhapus, setTerhapus] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const query = new URLSearchParams({ deleted: String(terhapus) });
    if (status) query.set('status', status);
    try {
      const [artikelRes, userRes] = await Promise.all([
        fetch(`/api/admin/artikel?${query}`, { cache: 'no-store' }),
        fetch('/api/auth/me', { cache: 'no-store' }),
      ]);
      const artikelData = await artikelRes.json();
      const userData = await userRes.json();
      if (!artikelRes.ok) throw new Error(artikelData.error || 'Gagal memuat artikel');
      setItems(artikelData.items || []);
      setUser(userData.user || null);
    } catch (error) {
      setItems([]);
      await swalError('Gagal Memuat Artikel', error instanceof Error ? error.message : undefined);
    } finally {
      setLoading(false);
    }
  }, [status, terhapus]);

  useEffect(() => {
    void load();
  }, [load]);

  function bolehMengelola(item: Artikel) {
    if (!user || user.role !== 'editor') return true;
    const pemilik = typeof item.createdBy === 'string' ? item.createdBy : item.createdBy?._id;
    return pemilik === user.id;
  }

  async function hapus(item: Artikel) {
    const { isConfirmed } = await swalConfirm(
      'Hapus Artikel?',
      'Artikel akan dipindahkan ke daftar terhapus dan masih dapat dipulihkan.',
    );
    if (!isConfirmed) return;
    const response = await fetch(`/api/admin/artikel/${item._id}`, { method: 'DELETE' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return swalError('Gagal Menghapus', data.error);
    await swalSuccess('Artikel Dihapus');
    await load();
  }

  async function pulihkan(item: Artikel) {
    const response = await fetch(`/api/admin/artikel/${item._id}/restore`, { method: 'POST' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return swalError('Gagal Memulihkan', data.error);
    await swalSuccess('Artikel Dipulihkan');
    await load();
  }

  return (
    <div>
      <PageHeader
        title="Artikel"
        description="Kelola artikel informasi dan berita PMB."
        action={
          <button
            onClick={() => router.push('/admin/artikel/tambah')}
            className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
          >
            + Tambah Artikel
          </button>
        }
      />

      <div className="mb-4 rounded-2xl border border-brand-100 bg-white p-4">
        <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <Field label="Status">
            <SearchableSelect
              searchable={false}
              rounded="full"
              value={status}
              onChange={setStatus}
              placeholder="Semua Status"
              options={Object.entries(STATUS).map(([value, item]) => ({
                value,
                label: item.label,
              }))}
            />
          </Field>
          <div className="flex rounded-full bg-brand-50 p-1">
            {[
              { value: false, label: 'Aktif' },
              { value: true, label: 'Terhapus' },
            ].map((pilihan) => (
              <button
                key={pilihan.label}
                type="button"
                onClick={() => setTerhapus(pilihan.value)}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  terhapus === pilihan.value ? 'bg-white text-brand-700 shadow-sm' : 'text-ink-muted'
                }`}
              >
                {pilihan.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-brand-100 bg-white">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-brand-50/70">
            <tr>
              <th className="px-5 py-3 text-left font-semibold">Judul</th>
              <th className="px-5 py-3 text-left font-semibold">Kategori</th>
              <th className="px-5 py-3 text-left font-semibold">Penulis</th>
              <th className="px-5 py-3 text-left font-semibold">Waktu Tayang</th>
              <th className="px-5 py-3 text-left font-semibold">Status</th>
              <th className="px-5 py-3 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-50">
            {loading ? (
              <TableLoadingRow colSpan={6} />
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-ink-muted">
                  {terhapus ? 'Belum ada artikel terhapus.' : 'Belum ada artikel pada saringan ini.'}
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item._id} className="hover:bg-brand-50/30">
                  <td className="max-w-xs px-5 py-3">
                    <p className="line-clamp-2 font-semibold text-ink">{item.judul}</p>
                    <p className="mt-0.5 text-xs text-ink-soft">{item.slug}</p>
                  </td>
                  <td className="px-5 py-3 text-ink-muted">{item.kategori_id?.nama || '—'}</td>
                  <td className="px-5 py-3 text-ink-muted">
                    {typeof item.createdBy === 'object' ? item.createdBy?.nama || '—' : '—'}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-ink-muted">
                    {item.publishedAt ? dayjs(item.publishedAt).format('DD MMM YYYY HH:mm') : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${STATUS[item.status].kelas}`}>
                      {item.pinned ? '★ ' : ''}{STATUS[item.status].label}
                    </span>
                  </td>
                  <td className="space-x-2 whitespace-nowrap px-5 py-3 text-right">
                    {bolehMengelola(item) && (terhapus ? (
                      <button onClick={() => pulihkan(item)} className="rounded-full border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50">
                        Pulihkan
                      </button>
                    ) : (
                      <>
                        <button onClick={() => router.push(`/admin/artikel/${item._id}/edit`)} className="rounded-full border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50">
                          Edit
                        </button>
                        <button onClick={() => hapus(item)} className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50">
                          Hapus
                        </button>
                      </>
                    ))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
