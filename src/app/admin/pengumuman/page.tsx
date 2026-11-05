'use client';

import { swalSuccess, swalError, swalConfirm } from '@/lib/swal';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import PageHeader from '@/components/admin/PageHeader';
import TableLoadingRow from '@/components/admin/TableLoadingRow';
import { Field } from '@/components/admin/Field';
import SearchableSelect from '@/components/ui/SearchableSelect';

type Peng = {
  _id: string;
  judul: string;
  slug: string;
  pinned: boolean;
  publishedAt: string;
  aktif: boolean;
};

const PAGE_SIZE = 10;

export default function PengumumanAdminPage() {
  const router = useRouter();
  const [items, setItems] = useState<Peng[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPin, setFilterPin] = useState('');
  const [page, setPage] = useState(1);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/pengumuman', { cache: 'no-store' });
    const data = await res.json();
    setItems(
      (data.items || []).map((p: any) => ({
        ...p,
        publishedAt: dayjs(p.publishedAt).format('YYYY-MM-DDTHH:mm'),
      })),
    );
    setLoading(false);
  }
  useEffect(() => { load(); }, []);
  useEffect(() => { setPage(1); }, [search, filterStatus, filterPin]);

  async function onDelete(id: string) {
    const { isConfirmed } = await swalConfirm('Hapus Pengumuman?', 'Tindakan ini tidak dapat dibatalkan.');
    if (!isConfirmed) return;
    const res = await fetch(`/api/admin/pengumuman/${id}`, { method: 'DELETE' });
    if (res.ok) { swalSuccess('Berhasil Dihapus'); load(); }
    else await swalError('Gagal Menghapus');
  }

  const q = search.toLowerCase();
  const hasActiveFilters = Boolean(q || filterStatus || filterPin);
  const filtered = items.filter((p) => {
    const matchSearch = !q || p.judul.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q);
    const matchStatus = !filterStatus || (filterStatus === 'tayang' ? p.aktif : !p.aktif);
    const matchPin = !filterPin || (filterPin === 'pinned' ? p.pinned : !p.pinned);
    return matchSearch && matchStatus && matchPin;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div>
      <PageHeader
        title="Pengumuman"
        description="Kelola pengumuman resmi panitia PMB."
        action={
          <button
            onClick={() => router.push('/admin/pengumuman/tambah')}
            className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
          >
            + Tambah Pengumuman
          </button>
        }
      />

      <div className="mb-4 rounded-2xl border border-brand-100 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-ink">Filter Data</h2>
            <p className="text-xs text-ink-muted">Saring pengumuman berdasarkan status dan pin.</p>
          </div>
          <div className="flex items-center gap-3 text-sm text-ink-muted">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => { setSearch(''); setFilterStatus(''); setFilterPin(''); }}
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
                placeholder="Judul atau slug..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-full border border-brand-200 bg-white pl-9 pr-4 py-2.5 text-sm placeholder:text-ink-soft focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand-400"
              />
            </div>
          </Field>
          <Field label="Status">
            <SearchableSelect
              searchable={false}
              rounded="full"
              value={filterStatus}
              onChange={setFilterStatus}
              placeholder="Semua Status"
              options={[
                { value: 'tayang', label: 'Tayang', dotColor: 'bg-brand' },
                { value: 'draft',  label: 'Draft',  dotColor: 'bg-gray-400' },
              ]}
            />
          </Field>
          <Field label="Pin">
            <SearchableSelect
              searchable={false}
              rounded="full"
              value={filterPin}
              onChange={setFilterPin}
              placeholder="Semua"
              options={[
                { value: 'pinned',    label: 'Dipinned',      dotColor: 'bg-orange-400' },
                { value: 'unpinned',  label: 'Tidak Dipin',   dotColor: 'bg-gray-300' },
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
              <th className="text-left px-5 py-3 font-semibold">Judul</th>
              <th className="text-left px-5 py-3 font-semibold">Tanggal</th>
              <th className="text-left px-5 py-3 font-semibold">Pin</th>
              <th className="text-left px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-50">
            {loading ? (
              <TableLoadingRow colSpan={6} />
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-ink-muted">
                  {search ? 'Tidak ada hasil untuk pencarian ini.' : 'Belum ada pengumuman.'}
                </td>
              </tr>
            ) : (
              pageItems.map((p, index) => (
                <tr key={p._id} className="hover:bg-brand-50/30">
                  <td className="px-5 py-3 text-ink-muted whitespace-nowrap">{(safePage - 1) * PAGE_SIZE + index + 1}</td>
                  <td className="px-5 py-3 font-medium text-ink">{p.judul}</td>
                  <td className="px-5 py-3 text-ink-muted whitespace-nowrap">
                    {dayjs(p.publishedAt).format('DD MMM YYYY')}
                  </td>
                  <td className="px-5 py-3 text-ink-muted">{p.pinned ? '📌' : '—'}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        p.aktif ? 'bg-brand-50 text-brand-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {p.aktif ? 'Tayang' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right space-x-2 whitespace-nowrap">
                    <button
                      onClick={() => router.push(`/admin/pengumuman/${p._id}/edit`)}
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
  );
}
