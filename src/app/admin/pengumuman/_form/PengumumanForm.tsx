'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import { swalSuccess } from '@/lib/swal';
import PageHeader from '@/components/admin/PageHeader';
import { Field, inputClass, selectClass, textareaClass } from '@/components/admin/Field';
import { ErrorAlert } from '@/components/admin/ModalShell';
import RichTextEditor from '@/components/admin/RichTextEditor';

type Peng = {
  _id: string;
  judul: string;
  judul_en: string;
  slug: string;
  ringkasan?: string;
  ringkasan_en?: string;
  konten?: string;
  konten_en?: string;
  pinned: boolean;
  publishedAt: string;
  aktif: boolean;
  metaTitle?: string;
  metaDescription?: string;
};

const empty: Peng = {
  _id: '',
  judul: '',
  judul_en: '',
  slug: '',
  ringkasan: '',
  ringkasan_en: '',
  konten: '',
  konten_en: '',
  pinned: false,
  publishedAt: dayjs().format('YYYY-MM-DDTHH:mm'),
  aktif: true,
  metaTitle: '',
  metaDescription: '',
};

export default function PengumumanForm({ initialData }: { initialData?: Partial<Peng> }) {
  const router = useRouter();
  const isEdit = !!initialData?._id;
  const [form, setForm] = useState<Peng>({ ...empty, ...initialData });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSave() {
    setSaving(true);
    setErr(null);
    const res = await fetch(
      isEdit ? `/api/admin/pengumuman/${form._id}` : '/api/admin/pengumuman',
      {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      },
    );
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setErr(data.error || 'Gagal menyimpan');
      return;
    }
    swalSuccess('Berhasil Disimpan');
    router.push('/admin/pengumuman');
  }

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Ubah Pengumuman' : 'Tambah Pengumuman'}
        description={isEdit ? `Mengedit: ${form.judul || '—'}` : 'Buat pengumuman baru.'}
        action={
          <button
            onClick={() => router.push('/admin/pengumuman')}
            className="rounded-full border border-brand-200 px-5 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50"
          >
            ← Kembali
          </button>
        }
      />

      <div className="max-w-3xl rounded-2xl bg-white border border-brand-100 p-6">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Judul (ID)" className="md:col-span-2">
            <input
              className={inputClass}
              value={form.judul}
              onChange={(e) => setForm({ ...form, judul: e.target.value })}
              placeholder="Judul pengumuman..."
            />
          </Field>

          <Field label="Title (EN)" className="md:col-span-2" hint="Opsional — terjemahan bahasa Inggris">
            <input
              className={inputClass}
              value={form.judul_en}
              onChange={(e) => setForm({ ...form, judul_en: e.target.value })}
              placeholder="English title..."
            />
          </Field>

          <Field label="Slug" hint="Kosongkan untuk otomatis">
            <input
              className={inputClass}
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="contoh-slug-pengumuman"
            />
          </Field>

          <Field label="Tanggal Publish">
            <input
              type="datetime-local"
              className={inputClass}
              value={form.publishedAt}
              onChange={(e) => setForm({ ...form, publishedAt: e.target.value })}
            />
          </Field>

          <Field label="Ringkasan (ID)" className="md:col-span-2">
            <textarea
              className={textareaClass}
              maxLength={320}
              rows={3}
              value={form.ringkasan || ''}
              onChange={(e) => setForm({ ...form, ringkasan: e.target.value })}
              placeholder="Ringkasan singkat pengumuman..."
            />
          </Field>

          <Field label="Summary (EN)" className="md:col-span-2" hint="Opsional — terjemahan bahasa Inggris">
            <textarea
              className={textareaClass}
              maxLength={320}
              rows={3}
              value={form.ringkasan_en || ''}
              onChange={(e) => setForm({ ...form, ringkasan_en: e.target.value })}
              placeholder="English summary..."
            />
          </Field>

          <Field label="Konten (ID)" className="md:col-span-2">
            <RichTextEditor
              value={form.konten || ''}
              onChange={(html) => setForm((prev) => ({ ...prev, konten: html }))}
              placeholder="Tulis konten pengumuman di sini..."
            />
          </Field>

          <Field label="Content (EN)" className="md:col-span-2" hint="Opsional — terjemahan bahasa Inggris">
            <RichTextEditor
              value={form.konten_en || ''}
              onChange={(html) => setForm((prev) => ({ ...prev, konten_en: html }))}
              placeholder="Write English content here..."
            />
          </Field>

          <Field label="Meta Title (SEO)">
            <input
              className={inputClass}
              maxLength={120}
              value={form.metaTitle || ''}
              onChange={(e) => setForm({ ...form, metaTitle: e.target.value })}
              placeholder="Judul untuk mesin pencari..."
            />
          </Field>

          <Field label="Meta Description (SEO)">
            <input
              className={inputClass}
              maxLength={220}
              value={form.metaDescription || ''}
              onChange={(e) => setForm({ ...form, metaDescription: e.target.value })}
              placeholder="Deskripsi untuk mesin pencari..."
            />
          </Field>

          <Field label="Pinned">
            <select
              className={selectClass}
              value={form.pinned ? '1' : '0'}
              onChange={(e) => setForm({ ...form, pinned: e.target.value === '1' })}
            >
              <option value="0">Tidak</option>
              <option value="1">Ya (tampil di atas)</option>
            </select>
          </Field>

          <Field label="Status">
            <select
              className={selectClass}
              value={form.aktif ? '1' : '0'}
              onChange={(e) => setForm({ ...form, aktif: e.target.value === '1' })}
            >
              <option value="1">Tayang</option>
              <option value="0">Draft</option>
            </select>
          </Field>
        </div>

        {err && <div className="mt-5"><ErrorAlert>{err}</ErrorAlert></div>}

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-brand-50 pt-5">
          <button
            onClick={() => router.push('/admin/pengumuman')}
            className="rounded-full border border-brand-200 px-5 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50"
          >
            Batal
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  );
}
