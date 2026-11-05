'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import PageHeader from '@/components/admin/PageHeader';
import RippleLoader from '@/components/ui/RippleLoader';
import { Field, inputClass, textareaClass } from '@/components/admin/Field';

type SosmedItem = { nama: string; url: string };

type Settings = {
  siteName?: string;
  tagline?: string;
  urlPendaftaran?: string;
  alamat?: string;
  email?: string;
  telepon?: string;
  whatsapp?: string;
  sosmed?: SosmedItem[];
  googleAnalyticsId?: string;
  googleSiteVerification?: string;
  defaultMetaTitle?: string;
  defaultMetaDescription?: string;
  ogImage?: string;
  instagramAccessToken?: string;
  instagramAccessTokenTerisi?: boolean;
  instagramFeedAktif?: boolean;
  recaptcha?: {
    aktif?: boolean;
    siteKey?: string;
    secretKey?: string;
    secretKeyTerisi?: boolean;
  };
};

export default function PengaturanPage() {
  const [data, setData] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingOgImage, setUploadingOgImage] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  // Secret tidak pernah dikirim utuh oleh server (FR-23): hanya bentuk tersamar untuk placeholder.
  // Input secret selalu kosong; kosong saat menyimpan berarti "tidak berubah".
  const [samar, setSamar] = useState({ instagram: '', recaptcha: '' });

  function terapkan(item: Settings) {
    setSamar({
      instagram: item.instagramAccessTokenTerisi ? item.instagramAccessToken || '' : '',
      recaptcha: item.recaptcha?.secretKeyTerisi ? item.recaptcha.secretKey || '' : '',
    });
    setData({
      ...item,
      instagramAccessToken: '',
      recaptcha: { ...item.recaptcha, secretKey: '' },
    });
  }

  useEffect(() => {
    fetch('/api/admin/pengaturan', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        terapkan(d.item || {});
        setLoading(false);
      });
  }, []);

  async function onOgImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadingOgImage(true);
    setErr(null);
    setMsg(null);

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/admin/upload-image', {
      method: 'POST',
      body: formData,
    });

    const d = await res.json().catch(() => ({}));
    setUploadingOgImage(false);

    if (!res.ok) {
      setErr(d.error || 'Gagal mengunggah gambar OG');
      return;
    }

    setData((prev) => ({ ...prev, ogImage: d.url || '' }));
    setMsg('Gambar OG berhasil diunggah. Klik "Simpan Pengaturan" untuk menyimpan perubahan.');
  }

  async function save() {
    setSaving(true);
    setErr(null);
    setMsg(null);
    const res = await fetch('/api/admin/pengaturan', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const d = await res.json();
    setSaving(false);
    if (!res.ok) {
      setErr(d.error || 'Gagal menyimpan');
      return;
    }
    if (d.item) terapkan(d.item);
    setMsg('Tersimpan.');
    setTimeout(() => setMsg(null), 3000);
  }

  return (
    <div>
      <PageHeader title="Pengaturan" description="Identitas situs, SEO default, dan kontak." />
      <div className="max-w-4xl rounded-2xl bg-white border border-brand-100 p-6 md:p-8">
        {loading ? (
          <RippleLoader className="min-h-[240px]" />
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Nama Situs">
              <input
                className={inputClass}
                value={data.siteName || ''}
                onChange={(e) => setData({ ...data, siteName: e.target.value })}
              />
            </Field>
            <Field label="Tagline">
              <input
                className={inputClass}
                value={data.tagline || ''}
                onChange={(e) => setData({ ...data, tagline: e.target.value })}
              />
            </Field>
            <Field label="URL Pendaftaran">
              <input
                className={inputClass}
                value={data.urlPendaftaran || ''}
                onChange={(e) => setData({ ...data, urlPendaftaran: e.target.value })}
              />
            </Field>
            <Field label="Alamat" className="md:col-span-2">
              <textarea
                className={textareaClass}
                value={data.alamat || ''}
                onChange={(e) => setData({ ...data, alamat: e.target.value })}
              />
            </Field>
            <Field label="Email">
              <input
                className={inputClass}
                type="email"
                value={data.email || ''}
                onChange={(e) => setData({ ...data, email: e.target.value })}
              />
            </Field>
            <Field label="Telepon">
              <input
                className={inputClass}
                value={data.telepon || ''}
                onChange={(e) => setData({ ...data, telepon: e.target.value })}
              />
            </Field>
            <Field label="WhatsApp">
              <input
                className={inputClass}
                value={data.whatsapp || ''}
                onChange={(e) => setData({ ...data, whatsapp: e.target.value })}
              />
            </Field>

            {/* Sosial Media */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-ink">Sosial Media</span>
                <button
                  type="button"
                  onClick={() =>
                    setData({
                      ...data,
                      sosmed: [...(data.sosmed || []), { nama: '', url: '' }],
                    })
                  }
                  className="rounded-full border border-brand-200 px-3 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50"
                >
                  + Tambah
                </button>
              </div>
              {(data.sosmed || []).length === 0 && (
                <p className="text-xs text-ink-muted">Belum ada sosial media. Klik &quot;+ Tambah&quot;.</p>
              )}
              <div className="space-y-3">
                {(data.sosmed || []).map((s, i) => (
                  <div key={i} className="flex gap-2 items-center flex-wrap md:flex-nowrap">
                    <input
                      className={inputClass + ' w-32 md:w-36 flex-shrink-0'}
                      placeholder="Instagram"
                      value={s.nama}
                      onChange={(e) => {
                        const arr = [...(data.sosmed || [])];
                        arr[i] = { ...arr[i], nama: e.target.value };
                        setData({ ...data, sosmed: arr });
                      }}
                    />
                    <input
                      className={inputClass + ' flex-1 min-w-xs md:min-w-lg'}
                      placeholder="https://instagram.com/..."
                      value={s.url}
                      onChange={(e) => {
                        const arr = [...(data.sosmed || [])];
                        arr[i] = { ...arr[i], url: e.target.value };
                        setData({ ...data, sosmed: arr });
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const arr = [...(data.sosmed || [])];
                        arr.splice(i, 1);
                        setData({ ...data, sosmed: arr });
                      }}
                      className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 whitespace-nowrap"
                    >
                      Hapus
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <Field label="Google Analytics ID">
              <input
                className={inputClass}
                value={data.googleAnalyticsId || ''}
                onChange={(e) => setData({ ...data, googleAnalyticsId: e.target.value })}
              />
            </Field>
            <Field label="Google Site Verification" className="md:col-span-2">
              <input
                className={inputClass}
                value={data.googleSiteVerification || ''}
                onChange={(e) => setData({ ...data, googleSiteVerification: e.target.value })}
              />
            </Field>
            <Field label="Meta Title default">
              <input
                className={inputClass}
                value={data.defaultMetaTitle || ''}
                onChange={(e) => setData({ ...data, defaultMetaTitle: e.target.value })}
              />
            </Field>
            <Field
              label="OG Image"
              hint="Ukuran optimal 1200 x 630 px, rasio 1.91:1, format JPG/PNG/WebP, maksimal 5 MB."
            >
              <div className="space-y-3">
                <label className="flex cursor-pointer items-center justify-center rounded-2xl border border-dashed border-brand-200 bg-brand-50/50 px-4 py-5 text-center hover:bg-brand-50">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={onOgImageChange}
                    disabled={uploadingOgImage}
                  />
                  <span className="text-sm font-semibold text-brand-700">
                    {uploadingOgImage ? 'Mengunggah gambar...' : 'Upload Foto OG'}
                  </span>
                </label>

                {data.ogImage ? (
                  <div className="overflow-hidden rounded-2xl border border-brand-100 bg-white">
                    <div className="relative aspect-[1200/630] w-full bg-brand-50">
                      <Image
                        src={data.ogImage}
                        alt="Preview OG"
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-100 px-4 py-3">
                      <p className="min-w-0 flex-1 truncate text-xs text-ink-muted">{data.ogImage}</p>
                      <button
                        type="button"
                        onClick={() => setData({ ...data, ogImage: '' })}
                        className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                      >
                        Hapus Gambar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-brand-100 bg-gray-50 px-4 py-4 text-sm text-ink-muted">
                    Belum ada gambar OG. Gambar ini akan dipakai sebagai preview saat link website dibagikan.
                  </div>
                )}
              </div>
            </Field>
            <Field label="Meta Description default" className="md:col-span-2">
              <textarea
                className={textareaClass}
                value={data.defaultMetaDescription || ''}
                onChange={(e) => setData({ ...data, defaultMetaDescription: e.target.value })}
              />
            </Field>

            {/* Instagram Feed */}
            <div className="md:col-span-2 border-t border-brand-100 pt-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-ink">Instagram Feed</p>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Tampilkan feed Instagram di beranda. Nonaktifkan untuk meringankan halaman (tidak ada request ke API Instagram).
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={data.instagramFeedAktif !== false}
                  onClick={() =>
                    setData({ ...data, instagramFeedAktif: data.instagramFeedAktif === false ? true : false })
                  }
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand/30 ${
                    data.instagramFeedAktif !== false ? 'bg-brand' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      data.instagramFeedAktif !== false ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              {data.instagramFeedAktif !== false && (
                <div className="rounded-2xl bg-brand-50/60 border border-brand-100 p-4">
                  <Field
                    label="Access Token"
                    hint={
                      samar.instagram
                        ? 'Token sudah tersimpan. Kosongkan bila tidak ingin mengubahnya.'
                        : 'Kunci rahasia — hanya digunakan server'
                    }
                  >
                    <input
                      type="password"
                      className={inputClass}
                      value={data.instagramAccessToken || ''}
                      onChange={(e) => setData({ ...data, instagramAccessToken: e.target.value })}
                      placeholder={samar.instagram ? `${samar.instagram} (tersimpan)` : 'IGQVJ...'}
                      autoComplete="new-password"
                      spellCheck={false}
                    />
                  </Field>
                </div>
              )}
            </div>

            {/* reCAPTCHA */}
            <div className="md:col-span-2 border-t border-brand-100 pt-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-ink">Google reCAPTCHA v2</p>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Proteksi halaman login admin dari bot. Daftarkan domain di{' '}
                    <a
                      href="https://www.google.com/recaptcha/admin"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-600 hover:underline"
                    >
                      google.com/recaptcha/admin
                    </a>
                    , pilih tipe <strong>reCAPTCHA v2 (checkbox)</strong>.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={!!data.recaptcha?.aktif}
                  onClick={() =>
                    setData({
                      ...data,
                      recaptcha: { ...data.recaptcha, aktif: !data.recaptcha?.aktif },
                    })
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand/30 ${
                    data.recaptcha?.aktif ? 'bg-brand' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      data.recaptcha?.aktif ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              {data.recaptcha?.aktif && (
                <div className="grid gap-4 md:grid-cols-2 rounded-2xl bg-brand-50/60 border border-brand-100 p-4">
                  <Field label="Site Key" hint="Kunci publik — aman diekspos ke browser">
                    <input
                      className={inputClass}
                      value={data.recaptcha?.siteKey || ''}
                      onChange={(e) =>
                        setData({ ...data, recaptcha: { ...data.recaptcha, siteKey: e.target.value } })
                      }
                      placeholder="6Lc..."
                      spellCheck={false}
                    />
                  </Field>
                  <Field
                    label="Secret Key"
                    hint={
                      samar.recaptcha
                        ? 'Secret key sudah tersimpan. Kosongkan bila tidak ingin mengubahnya.'
                        : 'Kunci rahasia — hanya digunakan server'
                    }
                  >
                    <input
                      type="password"
                      className={inputClass}
                      value={data.recaptcha?.secretKey || ''}
                      onChange={(e) =>
                        setData({ ...data, recaptcha: { ...data.recaptcha, secretKey: e.target.value } })
                      }
                      placeholder={samar.recaptcha ? `${samar.recaptcha} (tersimpan)` : '6Lc...'}
                      autoComplete="new-password"
                      spellCheck={false}
                    />
                  </Field>
                </div>
              )}
            </div>

            <div className="md:col-span-2 flex items-center gap-3 pt-2">
              <button
                onClick={save}
                disabled={saving}
                className="rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
              {msg && <span className="text-sm text-brand-700">{msg}</span>}
              {err && <span className="text-sm text-red-700">{err}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
