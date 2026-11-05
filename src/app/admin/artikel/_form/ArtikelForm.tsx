'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Field, inputClass, selectClass } from '@/components/admin/Field';
import { ErrorAlert } from '@/components/admin/ModalShell';
import PageHeader from '@/components/admin/PageHeader';
import RichTextEditor from '@/components/admin/RichTextEditor';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { swalSuccess } from '@/lib/swal';

type StatusArtikel = 'draft' | 'terjadwal' | 'terbit' | 'arsip';

export type ArtikelFormData = {
  _id: string;
  judul: string;
  judul_en: string;
  isi: string;
  isi_en: string;
  coverImage: string;
  status: StatusArtikel;
  publishedAt: string;
  pinned: boolean;
  kategori_id: string;
  tags: string[];
  metaTitle: string;
  metaDescription: string;
  ogImage: string;
};

type Kategori = {
  _id: string;
  nama: string;
  nama_en?: string;
};

type InitialData = Omit<Partial<ArtikelFormData>, 'kategori_id'> & {
  kategori_id?: string | { _id?: string };
};

const kosong: ArtikelFormData = {
  _id: '',
  judul: '',
  judul_en: '',
  isi: '',
  isi_en: '',
  coverImage: '',
  status: 'draft',
  publishedAt: '',
  pinned: false,
  kategori_id: '',
  tags: [],
  metaTitle: '',
  metaDescription: '',
  ogImage: '',
};

function idKategori(value: ArtikelFormData['kategori_id'] | { _id?: string }) {
  return typeof value === 'string' ? value : value?._id || '';
}

function normalisasiTags(tags: string[]) {
  const unik = new Map<string, string>();
  for (const tag of tags) {
    const bersih = tag.trim();
    const kunci = bersih.toLocaleLowerCase('id');
    if (bersih && !unik.has(kunci)) unik.set(kunci, bersih);
  }
  return [...unik.values()];
}

export default function ArtikelForm({
  initialData,
}: {
  initialData?: InitialData;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const ogFileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<ArtikelFormData>({
    ...kosong,
    ...initialData,
    kategori_id: idKategori(initialData?.kategori_id || ''),
  });
  const [kategori, setKategori] = useState<Kategori[]>([]);
  const [kategoriError, setKategoriError] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingOg, setUploadingOg] = useState(false);
  const [error, setError] = useState('');
  const isEdit = Boolean(form._id);

  useEffect(() => {
    fetch('/api/admin/kategori-artikel', { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Gagal memuat kategori');
        setKategori(data.items || []);
      })
      .catch((error) => setKategoriError(error instanceof Error ? error.message : 'Gagal memuat kategori'));
  }, []);

  function ubah<K extends keyof ArtikelFormData>(field: K, value: ArtikelFormData[K]) {
    setForm((sekarang) => ({ ...sekarang, [field]: value }));
  }

  function tambahTags(input: string) {
    const tagsBaru = normalisasiTags([...form.tags, ...input.split(',')]);
    if (!input.trim()) return;
    if (tagsBaru.length > 30) {
      setError('Maksimal 30 tag per artikel');
      return;
    }
    ubah('tags', tagsBaru);
    setTagInput('');
  }

  function hapusTag(index: number) {
    ubah('tags', form.tags.filter((_, posisi) => posisi !== index));
  }

  async function unggahSampul(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploading(true);
    setError('');
    const data = new FormData();
    data.set('file', file);
    try {
      const response = await fetch('/api/admin/artikel/upload-sampul', {
        method: 'POST',
        body: data,
      });
      const hasil = await response.json();
      if (!response.ok || !hasil.item?.url) {
        throw new Error(hasil.error || 'Gagal mengunggah sampul');
      }
      ubah('coverImage', hasil.item.url);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Gagal mengunggah sampul');
    } finally {
      setUploading(false);
    }
  }

  async function unggahGambarOg(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploadingOg(true);
    setError('');
    const data = new FormData();
    data.set('file', file);
    data.set('kegunaan', 'og');
    try {
      const response = await fetch('/api/admin/artikel/upload-sampul', {
        method: 'POST',
        body: data,
      });
      const hasil = await response.json();
      if (!response.ok || !hasil.item?.url) {
        throw new Error(hasil.error || 'Gagal mengunggah gambar OG');
      }
      ubah('ogImage', hasil.item.url);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Gagal mengunggah gambar OG');
    } finally {
      setUploadingOg(false);
    }
  }

  async function simpan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const tags = normalisasiTags([...form.tags, ...tagInput.split(',')]);
    if (tags.length > 30) {
      setSaving(false);
      setError('Maksimal 30 tag per artikel');
      return;
    }
    const payload = {
      ...form,
      tags,
      publishedAt: form.publishedAt || null,
    };
    const response = await fetch(
      isEdit ? `/api/admin/artikel/${form._id}` : '/api/admin/artikel',
      {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      const rincian = Array.isArray(data.details)
        ? data.details.map((item: { message?: string }) => item.message).filter(Boolean).join('. ')
        : '';
      setError(rincian || data.error || 'Gagal menyimpan artikel');
      return;
    }
    await swalSuccess('Artikel Berhasil Disimpan');
    router.push('/admin/artikel');
  }

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Ubah Artikel' : 'Tambah Artikel'}
        description={isEdit ? `Mengedit: ${form.judul || '—'}` : 'Buat artikel informasi PMB baru.'}
        action={
          <button type="button" onClick={() => router.push('/admin/artikel')} className="rounded-full border border-brand-200 px-5 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50">
            ← Kembali
          </button>
        }
      />

      <form onSubmit={simpan} className="max-w-4xl rounded-2xl border border-brand-100 bg-white p-6">
        <div className="grid gap-5 md:grid-cols-2">
      <Field label="Judul (ID)" className="md:col-span-2">
        <input
          className={inputClass}
          value={form.judul}
          onChange={(event) => ubah('judul', event.target.value)}
          placeholder="Judul artikel..."
        />
      </Field>

      <Field label="Title (EN)" hint="Opsional — fallback ke judul Indonesia" className="md:col-span-2">
        <input
          className={inputClass}
          value={form.judul_en}
          onChange={(event) => ubah('judul_en', event.target.value)}
          placeholder="English title..."
        />
      </Field>

      <Field label="Isi (ID)" className="md:col-span-2" hint="Gambar hanya digunakan sebagai sampul artikel.">
        <RichTextEditor
          value={form.isi}
          onChange={(html) => ubah('isi', html)}
          placeholder="Tulis isi artikel..."
          allowImages={false}
        />
      </Field>

      <Field label="Content (EN)" className="md:col-span-2" hint="Opsional — fallback ke isi Indonesia">
        <RichTextEditor
          value={form.isi_en}
          onChange={(html) => ubah('isi_en', html)}
          placeholder="Write English content..."
          allowImages={false}
        />
      </Field>

      <Field label="Kategori" error={kategoriError || undefined}>
        <SearchableSelect
          value={form.kategori_id}
          onChange={(value) => ubah('kategori_id', value)}
          placeholder="Pilih kategori"
          options={kategori.map((item) => ({
            value: item._id,
            label: item.nama,
            sublabel: item.nama_en,
          }))}
        />
      </Field>

      <div>
        <label htmlFor="artikel-tag-input" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-muted">Tag</label>
        <div className="flex min-h-11 w-full flex-wrap items-center gap-2 rounded-xl border border-brand-100 bg-white px-2.5 py-2 transition-colors duration-150 hover:border-brand-200 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
          {form.tags.map((tag, index) => (
            <span key={`${tag}-${index}`} className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 py-1 pl-3 pr-1.5 text-sm font-semibold text-brand-800">
              <span className="max-w-48 truncate">{tag}</span>
              <button type="button" onClick={() => hapusTag(index)} aria-label={`Hapus tag ${tag}`} className="inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-brand-700 transition-colors duration-150 hover:bg-brand-200 hover:text-brand-900 focus:outline-none focus:ring-2 focus:ring-brand/40">
                <svg viewBox="0 0 20 20" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="m6 6 8 8M14 6l-8 8" strokeLinecap="round" />
                </svg>
              </button>
            </span>
          ))}
          <input
            id="artikel-tag-input"
            className="min-w-36 flex-1 bg-transparent px-1 py-1 text-sm text-ink outline-none placeholder:text-ink-soft/60"
            value={tagInput}
            maxLength={60}
            onChange={(event) => setTagInput(event.target.value)}
            onBlur={() => tambahTags(tagInput)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ',') {
                event.preventDefault();
                tambahTags(tagInput);
              } else if (event.key === 'Backspace' && !tagInput && form.tags.length) {
                hapusTag(form.tags.length - 1);
              }
            }}
            aria-describedby="artikel-tag-hint"
            placeholder={form.tags.length ? 'Tambah tag…' : 'Contoh: beasiswa'}
          />
        </div>
        <span id="artikel-tag-hint" className="mt-1.5 block text-xs leading-relaxed text-ink-soft">Ketik tag lalu tekan Enter atau koma. Maksimal 30 tag.</span>
      </div>

      <Field label="Status">
        <select className={selectClass} value={form.status} onChange={(event) => ubah('status', event.target.value as StatusArtikel)}>
          <option value="draft">Draft</option>
          <option value="terjadwal">Terjadwal</option>
          <option value="terbit">Terbit</option>
          <option value="arsip">Arsip</option>
        </select>
      </Field>

      <Field label="Unggulan">
        <select className={selectClass} value={form.pinned ? '1' : '0'} onChange={(event) => ubah('pinned', event.target.value === '1')}>
          <option value="0">Tidak</option>
          <option value="1">Ya, tampil lebih dulu</option>
        </select>
      </Field>

      {(form.status === 'terjadwal' || form.status === 'terbit') && (
        <Field label="Waktu Tayang" className="md:col-span-2">
          <input type="datetime-local" className={inputClass} value={form.publishedAt} onChange={(event) => ubah('publishedAt', event.target.value)} />
        </Field>
      )}

      <Field label="Sampul Artikel" className="md:col-span-2" hint="JPEG, PNG, atau WebP; otomatis menjadi 16:9 dan maksimal 300 KB.">
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-brand-100 p-3">
          {form.coverImage ? (
            <Image src={form.coverImage} alt="Pratinjau sampul artikel" width={240} height={135} className="aspect-video w-40 rounded-lg object-cover" />
          ) : (
            <div className="flex aspect-video w-40 items-center justify-center rounded-lg bg-brand-50 text-xs text-ink-soft">Belum ada sampul</div>
          )}
          <button type="button" disabled={uploading || uploadingOg} onClick={() => fileRef.current?.click()} className="rounded-full border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-50">
            {uploading ? 'Mengunggah...' : form.coverImage ? 'Ganti Sampul' : 'Unggah Sampul'}
          </button>
          {form.coverImage && (
            <button type="button" onClick={() => ubah('coverImage', '')} className="text-sm font-semibold text-red-600">Hapus</button>
          )}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={unggahSampul} className="hidden" />
        </div>
      </Field>

      <Field label="Meta Title (SEO)">
        <input className={inputClass} maxLength={120} value={form.metaTitle} onChange={(event) => ubah('metaTitle', event.target.value)} placeholder="Fallback otomatis ke judul" />
      </Field>
      <Field label="Meta Description (SEO)">
        <input className={inputClass} maxLength={220} value={form.metaDescription} onChange={(event) => ubah('metaDescription', event.target.value)} placeholder="Fallback otomatis dari isi" />
      </Field>
      <Field label="Gambar OG" className="md:col-span-2" hint="Opsional untuk media sosial; jika kosong, sistem otomatis memakai sampul artikel.">
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-brand-100 p-3">
          {form.ogImage ? (
            <Image src={form.ogImage} alt="Pratinjau gambar OG" width={240} height={135} className="aspect-video w-40 rounded-lg object-cover" />
          ) : form.coverImage ? (
            <div className="relative">
              <Image src={form.coverImage} alt="Sampul yang dipakai sebagai gambar OG" width={240} height={135} className="aspect-video w-40 rounded-lg object-cover opacity-75" />
              <span className="absolute inset-x-1 bottom-1 rounded bg-black/70 px-2 py-1 text-center text-[10px] font-semibold text-white">Menggunakan sampul</span>
            </div>
          ) : (
            <div className="flex aspect-video w-40 items-center justify-center rounded-lg bg-brand-50 px-3 text-center text-xs text-ink-soft">Akan mengikuti sampul artikel</div>
          )}
          <button type="button" disabled={uploading || uploadingOg} onClick={() => ogFileRef.current?.click()} className="rounded-full border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-50">
            {uploadingOg ? 'Mengunggah...' : form.ogImage ? 'Ganti Gambar OG' : 'Unggah Gambar OG'}
          </button>
          {form.ogImage && (
            <button type="button" onClick={() => ubah('ogImage', '')} className="text-sm font-semibold text-red-600">Gunakan Sampul</button>
          )}
          <input ref={ogFileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={unggahGambarOg} className="hidden" />
        </div>
      </Field>
        </div>

        {error && <div className="mt-5"><ErrorAlert>{error}</ErrorAlert></div>}
        <div className="mt-6 flex justify-end gap-3 border-t border-brand-50 pt-5">
          <button type="button" onClick={() => router.push('/admin/artikel')} className="rounded-full border border-brand-200 px-5 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50">Batal</button>
          <button type="submit" disabled={saving || uploading || uploadingOg} className="rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60">
            {saving ? 'Menyimpan...' : 'Simpan Artikel'}
          </button>
        </div>
      </form>
    </div>
  );
}
