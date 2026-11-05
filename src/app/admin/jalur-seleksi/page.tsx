'use client';

import { swalSuccess, swalError, swalConfirm } from '@/lib/swal';
import { useEffect, useState } from 'react';
import PageHeader from '@/components/admin/PageHeader';
import TableLoadingRow from '@/components/admin/TableLoadingRow';
import { Field, inputClass, textareaClass } from '@/components/admin/Field';
import ModalShell, { ErrorAlert, ModalFooter, BtnCancel, BtnSave } from '@/components/admin/ModalShell';

type Jalur = {
  _id: string;
  nama: string;
  nama_en: string;
  slug: string;
  ringkasan?: string;
  ringkasan_en?: string;
  deskripsi?: string;
  deskripsi_en?: string;
  persyaratan?: string[];
  urutan?: number;
  aktif?: boolean;
  badge?: string;
};

const empty: Jalur = {
  _id: '',
  nama: '',
  nama_en: '',
  slug: '',
  ringkasan: '',
  ringkasan_en: '',
  deskripsi: '',
  deskripsi_en: '',
  persyaratan: [],
  urutan: 100,
  aktif: true,
  badge: '',
};

const PAGE_SIZE = 10;

export default function JalurAdminPage() {
  const [items, setItems] = useState<Jalur[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Jalur | null>(null);
  const [persyaratanRaw, setPersyaratanRaw] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const q = search.toLowerCase();
  const filtered = items.filter(
    (j) =>
      j.nama.toLowerCase().includes(q) ||
      j.slug.toLowerCase().includes(q) ||
      (j.badge || '').toLowerCase().includes(q),
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/jalur-seleksi', { cache: 'no-store' });
    const data = await res.json();
    setItems(data.items || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search]);

  function openCreate() {
    setEditing({ ...empty });
    setPersyaratanRaw('');
    setErr(null);
  }

  function openEdit(item: Jalur) {
    setEditing({ ...item });
    setPersyaratanRaw((item.persyaratan || []).join('\n'));
    setErr(null);
  }

  async function onSave() {
    if (!editing) return;
    setSaving(true);
    setErr(null);
    const payload = {
      ...editing,
      persyaratan: persyaratanRaw
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean),
      urutan: Number(editing.urutan) || 100,
    };
    const isEdit = !!editing._id;
    const res = await fetch(
      isEdit ? `/api/admin/jalur-seleksi/${editing._id}` : '/api/admin/jalur-seleksi',
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
    await load();
  }

  async function onDelete(id: string) {
    const { isConfirmed } = await swalConfirm('Hapus Jalur Seleksi?', 'Tindakan ini tidak dapat dibatalkan.');
    if (!isConfirmed) return;
    const res = await fetch(`/api/admin/jalur-seleksi/${id}`, { method: 'DELETE' });
    if (res.ok) { swalSuccess('Berhasil Dihapus'); load(); }
    else await swalError('Gagal Menghapus');
  }

  return (
    <div>
      <PageHeader
        title="Jalur Seleksi"
        description="Kelola daftar jalur penerimaan."
        action={
          <button
            onClick={openCreate}
            className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
          >
            + Tambah Jalur
          </button>
        }
      />

      <div className="mb-4">
        <input
          type="search"
          placeholder="Cari nama, slug, atau badge..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded-full border border-brand-100 bg-white px-4 py-2 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
      </div>

      <div className="rounded-2xl bg-white border border-brand-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-brand-50/70">
            <tr>
              <th className="text-left px-5 py-3 font-semibold">Nama</th>
              <th className="text-left px-5 py-3 font-semibold">Slug</th>
              <th className="text-left px-5 py-3 font-semibold">Badge</th>
              <th className="text-left px-5 py-3 font-semibold">Urutan</th>
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
                  {search ? 'Tidak ada hasil untuk pencarian ini.' : 'Belum ada jalur.'}
                </td>
              </tr>
            ) : (
              pageItems.map((j) => (
                <tr key={j._id} className="hover:bg-brand-50/30">
                  <td className="px-5 py-3 font-medium text-ink">{j.nama}</td>
                  <td className="px-5 py-3 text-ink-muted font-mono text-xs">{j.slug}</td>
                  <td className="px-5 py-3 text-ink-muted">{j.badge || '—'}</td>
                  <td className="px-5 py-3 text-ink-muted">{j.urutan}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        j.aktif
                          ? 'bg-brand-50 text-brand-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {j.aktif ? 'Aktif' : 'Nonaktif'}
                    </span>
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
            <button
              onClick={() => setPage(1)}
              disabled={safePage === 1}
              className="rounded-full px-3 py-1.5 font-semibold hover:bg-brand-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              «
            </button>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="rounded-full px-3 py-1.5 font-semibold hover:bg-brand-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ‹
            </button>
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
                  <button
                    key={n}
                    onClick={() => setPage(n as number)}
                    className={`rounded-full px-3 py-1.5 font-semibold transition-colors ${
                      safePage === n
                        ? 'bg-brand text-white'
                        : 'hover:bg-brand-50 text-ink-muted'
                    }`}
                  >
                    {n}
                  </button>
                ),
              )}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="rounded-full px-3 py-1.5 font-semibold hover:bg-brand-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ›
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={safePage === totalPages}
              className="rounded-full px-3 py-1.5 font-semibold hover:bg-brand-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              »
            </button>
          </div>
        </div>
      )}

      {editing && (
        <ModalShell title={editing._id ? 'Ubah Jalur' : 'Tambah Jalur'} onClose={() => setEditing(null)}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nama (ID)" className="md:col-span-2">
                <input
                  className={inputClass}
                  value={editing.nama}
                  onChange={(e) => setEditing({ ...editing, nama: e.target.value })}
                  required
                />
              </Field>
              <Field label="Name (EN)" className="md:col-span-2" hint="Optional English translation">
                <input
                  className={inputClass}
                  value={editing.nama_en}
                  onChange={(e) => setEditing({ ...editing, nama_en: e.target.value })}
                  placeholder="English name..."
                />
              </Field>
              <Field label="Slug" hint="Kosongkan untuk dibuat otomatis dari nama.">
                <input
                  className={inputClass}
                  value={editing.slug}
                  onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                  placeholder="auto-dari-nama"
                />
              </Field>
              <Field label="Badge (opsional)">
                <input
                  className={inputClass}
                  value={editing.badge || ''}
                  onChange={(e) => setEditing({ ...editing, badge: e.target.value })}
                  placeholder="Baru, Favorit, dll"
                />
              </Field>
              <Field label="Ringkasan (ID)" className="md:col-span-2" hint="Maksimal 400 karakter">
                <div className="space-y-1.5">
                  <textarea
                    className={textareaClass}
                    maxLength={400}
                    value={editing.ringkasan || ''}
                    onChange={(e) => setEditing({ ...editing, ringkasan: e.target.value })}
                  />
                  <div className="text-right text-xs text-ink-soft">
                    {(editing.ringkasan || '').length}/400
                  </div>
                </div>
              </Field>
              <Field
                label="Summary (EN)"
                className="md:col-span-2"
                hint="Optional English translation. Maksimal 400 karakter"
              >
                <div className="space-y-1.5">
                  <textarea
                    className={textareaClass}
                    maxLength={400}
                    value={editing.ringkasan_en || ''}
                    onChange={(e) => setEditing({ ...editing, ringkasan_en: e.target.value })}
                    placeholder="English summary..."
                  />
                  <div className="text-right text-xs text-ink-soft">
                    {(editing.ringkasan_en || '').length}/400
                  </div>
                </div>
              </Field>
              <Field label="Deskripsi (HTML diizinkan)" className="md:col-span-2">
                <textarea
                  className={textareaClass}
                  value={editing.deskripsi || ''}
                  onChange={(e) => setEditing({ ...editing, deskripsi: e.target.value })}
                  placeholder="<p>Penjelasan lengkap jalur...</p>"
                />
              </Field>
              <Field label="Description (EN — HTML allowed)" className="md:col-span-2" hint="Optional English translation">
                <textarea
                  className={textareaClass}
                  value={editing.deskripsi_en || ''}
                  onChange={(e) => setEditing({ ...editing, deskripsi_en: e.target.value })}
                  placeholder="<p>Full description...</p>"
                />
              </Field>
              <Field label="Persyaratan (1 per baris)" className="md:col-span-2">
                <textarea
                  className={textareaClass}
                  value={persyaratanRaw}
                  onChange={(e) => setPersyaratanRaw(e.target.value)}
                  placeholder={'Lulus SMA/sederajat\nNilai rapor minimal 80\n...'}
                />
              </Field>
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
                  className={inputClass}
                  value={editing.aktif ? '1' : '0'}
                  onChange={(e) => setEditing({ ...editing, aktif: e.target.value === '1' })}
                >
                  <option value="1">Aktif</option>
                  <option value="0">Nonaktif</option>
                </select>
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
