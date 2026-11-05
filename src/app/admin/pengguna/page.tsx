'use client';

import { swalSuccess, swalError, swalConfirm } from '@/lib/swal';
import { useEffect, useState } from 'react';
import PageHeader from '@/components/admin/PageHeader';
import TableLoadingRow from '@/components/admin/TableLoadingRow';
import { Field, inputClass, selectClass } from '@/components/admin/Field';
import ModalShell, { ErrorAlert, ModalFooter, BtnCancel, BtnSave } from '@/components/admin/ModalShell';
import SearchableSelect from '@/components/ui/SearchableSelect';

type User = {
  _id: string;
  email: string;
  nama: string;
  role: 'superadmin' | 'admin' | 'editor';
  aktif: boolean;
  mfaAktif?: boolean;
};

export default function PenggunaAdminPage() {
  const [items, setItems] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [form, setForm] = useState({
    email: '',
    nama: '',
    password: '',
    role: 'editor' as User['role'],
    aktif: true,
  });
  const [resetOf, setResetOf] = useState<User | null>(null);
  const [resetPwd, setResetPwd] = useState('');

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/pengguna', { cache: 'no-store' });
    if (res.status === 403) {
      setLoading(false);
      setItems([]);
      setErr('Hanya superadmin yang dapat mengelola pengguna.');
      return;
    }
    const data = await res.json();
    setItems(data.items || []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const res = await fetch('/api/admin/pengguna', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setErr(data.error || 'Gagal');
      return;
    }
    setCreating(false);
    setForm({ email: '', nama: '', password: '', role: 'editor', aktif: true });
    swalSuccess('Berhasil Disimpan');
    load();
  }

  async function onEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setErr(null);
    const res = await fetch(`/api/admin/pengguna/${editing._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nama: editing.nama,
        role: editing.role,
        aktif: editing.aktif,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(data.error || 'Gagal');
      return;
    }
    setEditing(null);
    swalSuccess('Berhasil Disimpan');
    load();
  }

  async function toggleAktif(u: User) {
    await fetch(`/api/admin/pengguna/${u._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aktif: !u.aktif }),
    });
    load();
  }

  async function onDelete(u: User) {
    const { isConfirmed } = await swalConfirm(`Hapus Pengguna?`, `Akun ${u.email} akan dihapus permanen.`);
    if (!isConfirmed) return;
    const res = await fetch(`/api/admin/pengguna/${u._id}`, { method: 'DELETE' });
    if (res.ok) { swalSuccess('Berhasil Dihapus'); load(); }
    else {
      const d = await res.json();
      await swalError('Gagal', d.error);
    }
  }

  // FR-09: untuk admin yang kehilangan HP dan kode pemulihan. Server menolak reset akun sendiri.
  async function onResetMfa(u: User) {
    const { isConfirmed } = await swalConfirm(
      'Reset MFA?',
      `Authenticator dan kode pemulihan ${u.email} dihapus, semua sesinya berakhir, dan ia wajib mendaftar MFA ulang saat login berikutnya. Pastikan permintaan ini benar dari pemilik akun.`,
    );
    if (!isConfirmed) return;
    const res = await fetch(`/api/admin/pengguna/${u._id}/reset-mfa`, { method: 'POST' });
    if (res.ok) {
      await swalSuccess('MFA Direset', `${u.email} wajib mendaftar MFA ulang saat login berikutnya.`);
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      await swalError('Gagal Mereset MFA', d.error);
    }
  }

  async function onResetPassword() {
    if (!resetOf) return;
    if (resetPwd.length < 8) {
      await swalError('Password Terlalu Pendek', 'Password minimal 8 karakter');
      return;
    }
    const res = await fetch(`/api/admin/pengguna/${resetOf._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: resetPwd }),
    });
    if (res.ok) {
      await swalSuccess('Password Diperbarui');
      setResetOf(null);
      setResetPwd('');
    } else {
      await swalError('Gagal Memperbarui Password');
    }
  }

  const q = search.trim().toLowerCase();
  const hasActiveFilters = Boolean(q || filterRole || filterStatus);
  const filtered = items.filter((u) => {
    const matchSearch =
      !q ||
      u.email.toLowerCase().includes(q) ||
      u.nama.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q);
    const matchRole = !filterRole || u.role === filterRole;
    const matchStatus = !filterStatus || (filterStatus === 'aktif' ? u.aktif : !u.aktif);
    return matchSearch && matchRole && matchStatus;
  });

  return (
    <div>
      <PageHeader
        title="Pengguna Admin"
        description="Kelola akun admin panel (khusus superadmin)."
        action={
          <button
            onClick={() => setCreating(true)}
            className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
          >
            + Tambah Pengguna
          </button>
        }
      />

      {err && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
          {err}
        </div>
      )}

      <div className="mb-4 rounded-2xl border border-brand-100 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-ink">Filter Data</h2>
            <p className="text-xs text-ink-muted">Saring akun berdasarkan nama, email, role, dan status.</p>
          </div>
          <div className="flex items-center gap-3 text-sm text-ink-muted">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setFilterRole('');
                  setFilterStatus('');
                }}
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
                placeholder="Cari nama atau email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-full border border-brand-200 bg-white pl-9 pr-4 py-2.5 text-sm placeholder:text-ink-soft focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand-400"
              />
            </div>
          </Field>
          <Field label="Role">
            <SearchableSelect
              searchable={false}
              rounded="full"
              value={filterRole}
              onChange={setFilterRole}
              placeholder="Semua Role"
              options={[
                { value: 'superadmin', label: 'Superadmin', dotColor: 'bg-brand' },
                { value: 'admin', label: 'Admin', dotColor: 'bg-blue-500' },
                { value: 'editor', label: 'Editor', dotColor: 'bg-gray-400' },
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
                { value: 'aktif', label: 'Aktif', dotColor: 'bg-brand' },
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
              <th className="text-left px-5 py-3 font-semibold">Email</th>
              <th className="text-left px-5 py-3 font-semibold">Nama</th>
              <th className="text-left px-5 py-3 font-semibold">Role</th>
              <th className="text-left px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-50">
            {loading ? (
              <TableLoadingRow colSpan={5} />
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-ink-muted">
                  {hasActiveFilters ? 'Tidak ada data yang cocok dengan filter saat ini.' : 'Tidak ada data.'}
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr key={u._id} className="hover:bg-brand-50/30">
                  <td className="px-5 py-3 font-medium text-ink">{u.email}</td>
                  <td className="px-5 py-3 text-ink-muted">{u.nama}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase text-brand-700">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => toggleAktif(u)}
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        u.aktif
                          ? 'bg-brand-50 text-brand-700 hover:bg-brand-100'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {u.aktif ? 'Aktif' : 'Nonaktif'}
                    </button>
                    <span
                      className={`ml-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        u.mfaAktif ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {u.mfaAktif ? 'MFA aktif' : 'MFA belum'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right space-x-2 whitespace-nowrap">
                    <button
                      onClick={() => {
                        setEditing({ ...u });
                        setErr(null);
                      }}
                      className="rounded-full border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setResetOf(u);
                        setResetPwd('');
                      }}
                      className="rounded-full border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50"
                    >
                      Reset Password
                    </button>
                    {u.mfaAktif && (
                      <button
                        onClick={() => onResetMfa(u)}
                        className="rounded-full border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                      >
                        Reset MFA
                      </button>
                    )}
                    <button
                      onClick={() => onDelete(u)}
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

      {creating && (
        <ModalShell title="Tambah Pengguna" onClose={() => setCreating(false)} maxWidth="max-w-md">
          <form onSubmit={onCreate}>
            <div className="grid gap-4">
              <Field label="Email">
                <input type="email" className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </Field>
              <Field label="Nama">
                <input className={inputClass} value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} required />
              </Field>
              <Field label="Password" hint="Minimal 8 karakter">
                <input type="password" className={inputClass} minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              </Field>
              <Field label="Role">
                <select className={selectClass} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as User['role'] })}>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Superadmin</option>
                </select>
              </Field>
            </div>
            {err && <ErrorAlert>{err}</ErrorAlert>}
            <ModalFooter>
              <BtnCancel onClick={() => setCreating(false)} />
              <BtnSave type="submit" />
            </ModalFooter>
          </form>
        </ModalShell>
      )}

      {editing && (
        <ModalShell title="Ubah Pengguna" subtitle={`Edit akun: ${editing.email}`} onClose={() => setEditing(null)} maxWidth="max-w-md">
          <form onSubmit={onEdit}>
            <div className="grid gap-4">
              <Field label="Email" hint="Email tidak dapat diubah">
                <input type="email" className={`${inputClass} bg-brand-50/40 text-ink-muted`} value={editing.email} disabled readOnly />
              </Field>
              <Field label="Nama">
                <input className={inputClass} value={editing.nama} onChange={(e) => setEditing({ ...editing, nama: e.target.value })} required />
              </Field>
              <Field label="Role">
                <select className={selectClass} value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value as User['role'] })}>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Superadmin</option>
                </select>
              </Field>
              <Field label="Status">
                <select className={selectClass} value={editing.aktif ? '1' : '0'} onChange={(e) => setEditing({ ...editing, aktif: e.target.value === '1' })}>
                  <option value="1">Aktif</option>
                  <option value="0">Nonaktif</option>
                </select>
              </Field>
            </div>
            {err && <ErrorAlert>{err}</ErrorAlert>}
            <ModalFooter>
              <BtnCancel onClick={() => setEditing(null)} />
              <BtnSave type="submit" />
            </ModalFooter>
          </form>
        </ModalShell>
      )}

      {resetOf && (
        <ModalShell title="Reset Password" subtitle={`Untuk pengguna: ${resetOf.email}`} onClose={() => setResetOf(null)} maxWidth="max-w-md">
          <Field label="Password baru" hint="Minimal 8 karakter">
            <input type="password" className={inputClass} value={resetPwd} onChange={(e) => setResetPwd(e.target.value)} minLength={8} />
          </Field>
          <ModalFooter>
            <BtnCancel onClick={() => setResetOf(null)} />
            <BtnSave onClick={onResetPassword} />
          </ModalFooter>
        </ModalShell>
      )}
    </div>
  );
}
