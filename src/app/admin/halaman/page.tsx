'use client';

import { swalSuccess, swalError, swalConfirm } from '@/lib/swal';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import PageHeader from '@/components/admin/PageHeader';
import RippleLoader from '@/components/ui/RippleLoader';
import { Field, inputClass, textareaClass } from '@/components/admin/Field';

type HeroData = {
  judul?: string;
  subJudul?: string;
  tahunAjaran?: string;
  heroImages?: string[];
};

// Server menolak field tak dikenal (FR-22): kirim hanya field yang dikenal editor ini.
function bersihkanHero(h: HeroData): HeroData {
  const { judul, subJudul, tahunAjaran, heroImages } = h;
  return { judul, subJudul, tahunAjaran, heroImages };
}

export default function HalamanAdminPage() {
  const [hero, setHero] = useState<HeroData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/halaman', { cache: 'no-store' });
    const data = await res.json();
    const heroItem = (data.items || []).find((i: any) => i.kunci === 'hero');
    setHero(heroItem?.data || {});
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    setSaving(true);
    setMsg(null);
    const res = await fetch('/api/admin/halaman', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kunci: 'hero', data: bersihkanHero(hero) }),
    });
    setSaving(false);
    if (res.ok) setMsg('Tersimpan.');
    else setMsg('Gagal menyimpan');
    setTimeout(() => setMsg(null), 3000);
  }

  async function saveImages(images: string[]) {
    await fetch('/api/admin/halaman', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kunci: 'hero', data: bersihkanHero({ ...hero, heroImages: images }) }),
    });
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMsg(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      let res: Response;
      try {
        res = await fetch('/api/admin/hero-images/upload', {
          method: 'POST',
          body: formData,
        });
      } catch (networkErr: any) {
        setMsg(`Gagal terhubung ke server: ${networkErr.message}`);
        return;
      }

      // Parse JSON separately — Nginx may return HTML on 413/502/504
      let data: any = {};
      try {
        data = await res.json();
      } catch {
        const statusHint =
          res.status === 413 ? 'File terlalu besar — batas ukuran Nginx mungkin 1 MB.' :
          res.status === 502 ? 'Server tidak merespons (502 Bad Gateway).' :
          res.status === 504 ? 'Server timeout (504 Gateway Timeout).' :
          'Server mengembalikan respons tidak valid.';
        setMsg(`[${res.status}] ${statusHint} Cek log server atau hubungi administrator.`);
        return;
      }

      if (!res.ok) {
        const statusHint =
          res.status === 413 ? ' (File terlalu besar — batas Nginx)' :
          res.status === 403 ? ' (Tidak ada izin akses)' :
          '';
        setMsg((data.error || 'Gagal mengunggah gambar') + statusHint);
        return;
      }

      const newImages = [...(hero.heroImages || []), data.url];
      setHero({ ...hero, heroImages: newImages });
      await saveImages(newImages);
      setMsg('Gambar berhasil diunggah');
      setTimeout(() => setMsg(null), 3000);
    } catch (err: any) {
      setMsg(`Gagal mengunggah gambar: ${err.message ?? 'unknown error'}`);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function handleImageDelete(url: string) {
    const { isConfirmed } = await swalConfirm('Hapus Gambar?', 'Tindakan ini tidak dapat dibatalkan.');
    if (!isConfirmed) return;

    setMsg(null);
    const filename = url.split('/').pop();

    try {
      const res = await fetch(`/api/admin/hero-images/${filename}`, {
        method: 'DELETE',
      });

      // Allow 404 (file already gone from disk) — still remove from DB
      if (!res.ok && res.status !== 404) {
        setMsg('Gagal menghapus gambar');
        return;
      }

      const newImages = (hero.heroImages || []).filter((img) => img !== url);
      setHero({ ...hero, heroImages: newImages });
      await saveImages(newImages);
      setMsg('Gambar berhasil dihapus');
      setTimeout(() => setMsg(null), 3000);
    } catch (err) {
      setMsg('Gagal menghapus gambar');
    }
  }

  return (
    <div>
      <PageHeader title="Halaman" description="Ubah isi hero landing page." />

      <div className="max-w-3xl rounded-2xl bg-white border border-brand-100 p-6 md:p-8">
        <h2 className="font-display text-lg font-bold text-ink mb-4">Hero Landing</h2>
        {loading ? (
          <RippleLoader className="min-h-[240px]" />
        ) : (
          <div className="grid gap-4">
            <Field label="Judul" hint="Biarkan kosong untuk pakai default.">
              <input
                className={inputClass}
                value={hero.judul || ''}
                onChange={(e) => setHero({ ...hero, judul: e.target.value })}
                placeholder="Mulai Langkahmu Menjadi Mahasiswa UNJANI"
              />
            </Field>
            <Field label="Sub-judul">
              <textarea
                className={textareaClass}
                value={hero.subJudul || ''}
                onChange={(e) => setHero({ ...hero, subJudul: e.target.value })}
              />
            </Field>
            <Field label="Tahun Ajaran">
              <input
                className={inputClass}
                value={hero.tahunAjaran || ''}
                onChange={(e) => setHero({ ...hero, tahunAjaran: e.target.value })}
                placeholder="Tahun Akademik 2026/2027"
              />
            </Field>

            {/* Foto Hero */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <label className="text-sm font-semibold text-ink">Foto Hero</label>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Ukuran optimal: <strong>800×600px</strong> atau lebih (rasio 4:3). Max 10 MB. Format: JPEG, PNG, WebP.
                  </p>
                </div>
                <label className="rounded-full border border-brand-200 px-3 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50 cursor-pointer whitespace-nowrap">
                  + Tambah Foto
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </div>

              {(hero.heroImages || []).length === 0 ? (
                <p className="text-xs text-ink-muted">Belum ada foto. Klik &quot;+ Tambah Foto&quot; untuk mengunggah.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {(hero.heroImages || []).map((url) => (
                    <div key={url} className="relative group">
                      <div className="relative w-full h-32 rounded-lg border border-brand-100 overflow-hidden">
                        <Image
                          src={url}
                          alt="Hero"
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 50vw, 33vw"
                          onError={(e) => {
                            const wrapper = (e.target as HTMLImageElement).closest('.relative.group');
                            if (wrapper) (wrapper as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleImageDelete(url)}
                        className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition rounded-lg"
                      >
                        <span className="text-xs font-semibold text-white">Hapus</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 flex items-center gap-3">
              <button
                onClick={save}
                disabled={saving}
                className="rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
              {msg && <span className="text-sm text-ink-muted">{msg}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
