'use client';

import { swalSuccess, swalError, swalConfirm } from '@/lib/swal';
import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import PageHeader from '@/components/admin/PageHeader';
import RippleLoader from '@/components/ui/RippleLoader';
import { Field, inputClass, selectClass, textareaClass } from '@/components/admin/Field';
import ModalShell, { ErrorAlert, ModalFooter, BtnCancel, BtnSave } from '@/components/admin/ModalShell';
import TabStatus, { panelTab, useTabUrl } from '@/components/admin/TabStatus';
import LabelStatus, { LABEL_POPUP } from '@/components/admin/LabelStatus';
import { URUTAN_STATUS, hariMenujuMulai, sisaHari, statusPopup } from '@/lib/statusPeriode';

type Popup = {
  _id: string;
  judul: string;
  alt?: string;
  url?: string;
  aktif: boolean;
  tampilDari?: string | null;
  tampilSampai?: string | null;
  hideForDays: number;
  durasiTampil: number;
  urutan: number;
  gambarFilename?: string;
  createdAt?: string;
};

const PAGE_SIZE = 6;

export default function PopupAdminPage() {
  const [items, setItems] = useState<Popup[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Popup | null>(null);
  const [search, setSearch] = useState('');
  // Tab bawaan: Tayang & terjadwal; Arsip memuat popup yang rentang tayangnya sudah lewat (FR-71).
  const [tab, pilihTab] = useTabUrl(['tayang', 'arsip'], 'tayang');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({
    judul: '',
    alt: '',
    url: '',
    urutan: 100,
    hideForDays: 1,
    durasiTampil: 5,
    aktif: true,
    tampilDari: '',
    tampilSampai: '',
    file: null as File | null,
  });

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/popup', { cache: 'no-store' });
      const data = res.ok ? await res.json().catch(() => ({})) : {};
      setItems(data.items || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);
  useEffect(() => { setPage(1); }, [search, tab]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.file) {
      setErr('Pilih gambar');
      return;
    }
    setSaving(true);
    setErr(null);
    const fd = new FormData();
    fd.set('file', form.file);
    fd.set('judul', form.judul);
    fd.set('alt', form.alt);
    fd.set('url', form.url);
    fd.set('urutan', String(form.urutan));
    fd.set('hideForDays', String(form.hideForDays));
    fd.set('durasiTampil', String(form.durasiTampil));
    fd.set('aktif', form.aktif ? 'true' : 'false');
    fd.set('tampilDari', form.tampilDari);
    fd.set('tampilSampai', form.tampilSampai);
    const res = await fetch('/api/admin/popup', { method: 'POST', body: fd });
    const d = await res.json();
    setSaving(false);
    if (!res.ok) {
      setErr(d.error || 'Gagal');
      return;
    }
    setCreating(false);
    setForm({
      judul: '',
      alt: '',
      url: '',
      urutan: 100,
      hideForDays: 1,
      durasiTampil: 5,
      aktif: true,
      tampilDari: '',
      tampilSampai: '',
      file: null,
    });
    swalSuccess('Berhasil Disimpan');
    load();
  }

  async function onEditSave() {
    if (!editing) return;
    const res = await fetch(`/api/admin/popup/${editing._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        judul: editing.judul,
        alt: editing.alt,
        url: editing.url,
        urutan: Number(editing.urutan),
        hideForDays: Number(editing.hideForDays),
        durasiTampil: Number(editing.durasiTampil),
        aktif: editing.aktif,
        tampilDari: editing.tampilDari || undefined,
        tampilSampai: editing.tampilSampai || undefined,
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

  async function onDelete(id: string) {
    const { isConfirmed } = await swalConfirm('Hapus Popup?', 'Gambar juga akan dihapus permanen.');
    if (!isConfirmed) return;
    const res = await fetch(`/api/admin/popup/${id}`, { method: 'DELETE' });
    if (res.ok) { swalSuccess('Berhasil Dihapus'); load(); }
    else await swalError('Gagal Menghapus');
  }

  const q = search.toLowerCase();
  const hasActiveFilters = Boolean(q);
  const jumlahArsip = items.filter((p) => statusPopup(p) === 'arsip').length;
  const jumlahTayang = items.length - jumlahArsip;
  const filtered = items
    .filter((p) => {
      if ((statusPopup(p) === 'arsip') !== (tab === 'arsip')) return false;
      return !q || p.judul.toLowerCase().includes(q);
    })
    .sort((a, b) =>
      tab === 'arsip'
        ? new Date(b.tampilSampai ?? 0).getTime() - new Date(a.tampilSampai ?? 0).getTime()
        : URUTAN_STATUS[statusPopup(a)] - URUTAN_STATUS[statusPopup(b)] || a.urutan - b.urutan,
    );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div>
      <PageHeader
        title="Popup Landing"
        description="Atur popup gambar yang muncul saat pengunjung membuka halaman utama."
        action={
          <button
            onClick={() => setCreating(true)}
            className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
          >
            + Tambah Popup
          </button>
        }
      />

      <TabStatus
        idDasar="popup"
        label="Status popup"
        aktif={tab}
        onPilih={pilihTab}
        tabs={[
          { id: 'tayang', label: 'Tayang & terjadwal', jumlah: jumlahTayang },
          { id: 'arsip', label: 'Arsip', jumlah: jumlahArsip },
        ]}
      />

      <div {...panelTab('popup', tab, tab)}>
      <div className="mb-4 rounded-2xl border border-brand-100 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-ink">Filter Data</h2>
            <p className="text-xs text-ink-muted">Cari popup berdasarkan judul.</p>
          </div>
          <div className="flex items-center gap-3 text-sm text-ink-muted">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="rounded-full border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50"
              >
                Reset Filter
              </button>
            )}
            <span>{filtered.length} hasil ditemukan</span>
          </div>
        </div>
        <div className="grid gap-3 items-end">
          <Field label="Cari">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-soft pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input
                type="search"
                placeholder="Cari judul popup..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-full border border-brand-200 bg-white pl-9 pr-4 py-2.5 text-sm placeholder:text-ink-soft focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand-400"
              />
            </div>
          </Field>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="md:col-span-2 lg:col-span-3">
            <RippleLoader className="min-h-[240px]" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-ink-muted md:col-span-2 lg:col-span-3">
            {hasActiveFilters ? 'Tidak ada hasil untuk filter ini.' : tab === 'arsip' ? 'Belum ada popup di arsip.' : 'Tidak ada popup yang tayang maupun terjadwal.'}
          </p>
        ) : (
          pageItems.map((p) => (
            <div
              key={p._id}
              className="rounded-2xl bg-white border border-brand-100 overflow-hidden shadow-soft"
            >
              <div className="aspect-[4/3] bg-brand-50/50 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/popup-image/${p._id}`}
                  alt={p.alt || p.judul}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-ink truncate">{p.judul}</h3>
                  <LabelStatus status={statusPopup(p)} label={LABEL_POPUP[statusPopup(p)]} />
                </div>
                {(() => {
                  const st = statusPopup(p);
                  const sisa = sisaHari(p.tampilSampai);
                  const menuju = hariMenujuMulai(p.tampilDari);
                  const teks =
                    st === 'berjalan' && sisa !== null
                      ? `Sisa ${sisa} hari (sampai ${dayjs(p.tampilSampai).format('D MMM YYYY')})`
                      : st === 'akan-datang' && menuju !== null
                        ? `Mulai ${menuju} hari lagi (${dayjs(p.tampilDari).format('D MMM YYYY')})`
                        : st === 'arsip'
                          ? `Berakhir ${dayjs(p.tampilSampai).format('D MMM YYYY')}`
                          : st === 'berjalan'
                            ? 'Tanpa batas akhir'
                            : null;
                  return teks ? <p className="text-xs font-semibold text-ink-muted">{teks}</p> : null;
                })()}
                {p.url && (
                  <p className="text-xs text-ink-muted truncate">
                    <span className="font-semibold">URL:</span> {p.url}
                  </p>
                )}
                <p className="text-xs text-ink-soft">
                  Urutan {p.urutan} · Hide {p.hideForDays} hari · Durasi {(p.durasiTampil ?? 5) === 0 ? 'Manual' : `${p.durasiTampil ?? 5} dtk`}
                </p>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() =>
                      setEditing({
                        ...p,
                        tampilDari: p.tampilDari
                          ? dayjs(p.tampilDari).format('YYYY-MM-DDTHH:mm')
                          : '',
                        tampilSampai: p.tampilSampai
                          ? dayjs(p.tampilSampai).format('YYYY-MM-DDTHH:mm')
                          : '',
                      })
                    }
                    className="flex-1 rounded-full border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(p._id)}
                    className="flex-1 rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
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

      {creating && (
        <ModalShell title="Tambah Popup" onClose={() => setCreating(false)}>
          <form onSubmit={onCreate}>
            <div className="grid gap-4">
              <Field label="Judul (internal)">
                <input
                  className={inputClass}
                  value={form.judul}
                  onChange={(e) => setForm({ ...form, judul: e.target.value })}
                  required
                />
              </Field>
              <Field label="Alt text (aksesibilitas)">
                <input
                  className={inputClass}
                  value={form.alt}
                  onChange={(e) => setForm({ ...form, alt: e.target.value })}
                  placeholder="Deskripsi singkat gambar"
                />
              </Field>
              <Field label="URL tujuan (opsional)" hint="Kosongkan jika popup tidak clickable.">
                <input
                  type="url"
                  className={inputClass}
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="https://..."
                />
              </Field>
              <div>
                <div className="mb-2.5 rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-3 text-xs text-ink-muted space-y-2">
                  <p className="font-semibold text-brand-700 flex items-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="flex-none"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                    Rekomendasi ukuran gambar popup
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-white border border-brand-100 px-3 py-2 text-center">
                      <div className="font-bold text-ink text-sm">1 : 1</div>
                      <div className="text-[10px] text-ink-muted mt-0.5">800 × 800 px</div>
                      <div className="mt-1 text-[10px] text-brand-700 font-semibold">Kotak — Universal</div>
                    </div>
                    <div className="rounded-lg bg-white border border-brand-100 px-3 py-2 text-center">
                      <div className="font-bold text-ink text-sm">4 : 5</div>
                      <div className="text-[10px] text-ink-muted mt-0.5">800 × 1000 px</div>
                      <div className="mt-1 text-[10px] text-brand-700 font-semibold">Portrait — Ideal</div>
                    </div>
                    <div className="rounded-lg bg-white border border-brand-100 px-3 py-2 text-center">
                      <div className="font-bold text-ink text-sm">3 : 4</div>
                      <div className="text-[10px] text-ink-muted mt-0.5">900 × 1200 px</div>
                      <div className="mt-1 text-[10px] text-brand-700 font-semibold">Portrait — Tinggi</div>
                    </div>
                  </div>
                  <p className="text-[10px] text-ink-soft">Format: PNG · JPG · WebP · GIF &bull; Maks. 5 MB &bull; Hindari rasio landscape (lebih lebar dari tinggi) agar terlihat baik di semua layar.</p>
                </div>
                <Field label="Gambar">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    required
                    onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })}
                    className="block w-full text-sm text-ink file:mr-4 file:rounded-full file:border-0 file:bg-brand-50 file:text-brand-700 file:font-semibold file:px-4 file:py-2"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Urutan">
                  <input
                    type="number"
                    className={inputClass}
                    value={form.urutan}
                    onChange={(e) => setForm({ ...form, urutan: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Hide (hari)">
                  <input
                    type="number"
                    min={0}
                    max={365}
                    className={inputClass}
                    value={form.hideForDays}
                    onChange={(e) => setForm({ ...form, hideForDays: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Durasi tampil (detik)" hint="0 = tidak menutup otomatis">
                  <input
                    type="number"
                    min={0}
                    max={3600}
                    className={inputClass}
                    value={form.durasiTampil}
                    onChange={(e) => setForm({ ...form, durasiTampil: Number(e.target.value) })}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tampil dari (opsional)">
                  <input
                    type="datetime-local"
                    className={inputClass}
                    value={form.tampilDari}
                    onChange={(e) => setForm({ ...form, tampilDari: e.target.value })}
                  />
                </Field>
                <Field label="Tampil sampai (opsional)">
                  <input
                    type="datetime-local"
                    className={inputClass}
                    value={form.tampilSampai}
                    onChange={(e) => setForm({ ...form, tampilSampai: e.target.value })}
                  />
                </Field>
              </div>
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
            {err && <ErrorAlert>{err}</ErrorAlert>}
            <ModalFooter>
              <BtnCancel onClick={() => setCreating(false)} />
              <BtnSave type="submit" loading={saving} />
            </ModalFooter>
          </form>
        </ModalShell>
      )}

      {editing && (
        <ModalShell title="Ubah Popup" subtitle="Gambar tidak dapat diganti. Hapus & unggah ulang bila perlu." onClose={() => setEditing(null)}>
          <div className="grid gap-4">
            <Field label="Judul">
              <input
                className={inputClass}
                value={editing.judul}
                onChange={(e) => setEditing({ ...editing, judul: e.target.value })}
              />
            </Field>
            <Field label="Alt">
              <input
                className={inputClass}
                value={editing.alt || ''}
                onChange={(e) => setEditing({ ...editing, alt: e.target.value })}
              />
            </Field>
            <Field label="URL">
              <input
                type="url"
                className={inputClass}
                value={editing.url || ''}
                onChange={(e) => setEditing({ ...editing, url: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Urutan">
                <input
                  type="number"
                  className={inputClass}
                  value={editing.urutan}
                  onChange={(e) => setEditing({ ...editing, urutan: Number(e.target.value) })}
                />
              </Field>
              <Field label="Hide (hari)">
                <input
                  type="number"
                  className={inputClass}
                  value={editing.hideForDays}
                  onChange={(e) => setEditing({ ...editing, hideForDays: Number(e.target.value) })}
                />
              </Field>
              <Field label="Durasi tampil (detik)" hint="0 = tidak menutup otomatis">
                <input
                  type="number"
                  min={0}
                  max={3600}
                  className={inputClass}
                  value={editing.durasiTampil ?? 5}
                  onChange={(e) => setEditing({ ...editing, durasiTampil: Number(e.target.value) })}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tampil dari">
                <input
                  type="datetime-local"
                  className={inputClass}
                  value={editing.tampilDari || ''}
                  onChange={(e) => setEditing({ ...editing, tampilDari: e.target.value })}
                />
              </Field>
              <Field label="Tampil sampai">
                <input
                  type="datetime-local"
                  className={inputClass}
                  value={editing.tampilSampai || ''}
                  onChange={(e) => setEditing({ ...editing, tampilSampai: e.target.value })}
                />
              </Field>
            </div>
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
          <ModalFooter>
            <BtnCancel onClick={() => setEditing(null)} />
            <BtnSave onClick={onEditSave} />
          </ModalFooter>
        </ModalShell>
      )}
    </div>
  );
}
