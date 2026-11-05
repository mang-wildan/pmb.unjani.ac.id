'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import PageHeader from '@/components/admin/PageHeader';
import RippleLoader from '@/components/ui/RippleLoader';
import KodePemulihan from '@/app/admin/login/_components/KodePemulihan';
import {
  PesanGalat,
  PesanInfo,
  TombolUtama,
  kelasInput,
  kelasLabel,
  panggilApi,
} from '@/app/admin/login/_components/shared';

// Akun Saya (FR-08): status MFA dan buat ulang kode pemulihan. Membuat ulang set mewajibkan
// kode TOTP yang valid; set lama langsung hangus.

type Info = {
  akun: { email: string; nama: string; role: string; lastLoginAt: string | null };
  mfa: { aktif: boolean; diaktifkanPada: string | null; sisaKodePemulihan: number };
};

const ROLE_LABEL: Record<string, string> = { superadmin: 'Super Admin', admin: 'Admin', editor: 'Editor' };

function tanggal(iso: string | null) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });
}

export default function AkunSayaPage() {
  const [info, setInfo] = useState<Info | null>(null);
  const [errMuat, setErrMuat] = useState<string | null>(null);
  const [kode, setKode] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [kodeBaru, setKodeBaru] = useState<string[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const muat = useCallback(async () => {
    const j = await panggilApi('/api/admin/akun');
    if (j.ok) {
      setInfo(j.data as unknown as Info);
      setErrMuat(null);
    } else {
      setErrMuat(String(j.data.error || 'Gagal memuat data akun.'));
    }
  }, []);

  useEffect(() => {
    void muat();
  }, [muat]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setErr(null);
    if (!/^\d{6}$/.test(kode)) {
      setErr('Masukkan 6 digit kode yang tampil di aplikasi authenticator.');
      return;
    }
    setLoading(true);
    const j = await panggilApi('/api/admin/akun/kode-pemulihan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kode }),
    });
    setLoading(false);
    setKode('');
    if (j.ok && Array.isArray(j.data.kodePemulihan)) {
      setKodeBaru(j.data.kodePemulihan.map(String));
      return;
    }
    setErr(String(j.data.error || 'Gagal membuat kode pemulihan. Coba lagi.'));
    inputRef.current?.focus();
  }

  if (kodeBaru && info) {
    return (
      <div className="max-w-lg">
        <PageHeader title="Akun Saya" description="Kode pemulihan baru" />
        <div className="rounded-2xl border border-brand-50 bg-white p-6 shadow-sm">
          <KodePemulihan
            kode={kodeBaru}
            email={info.akun.email}
            tombolLanjut="Selesai"
            onLanjut={() => {
              setKodeBaru(null);
              void muat();
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Akun Saya" description="Informasi akun dan keamanan verifikasi dua langkah (MFA)." />

      {errMuat && <PesanGalat pesan={errMuat} />}
      {!info && !errMuat && (
        <div className="flex justify-center py-16" role="status" aria-label="Memuat">
          <RippleLoader />
        </div>
      )}

      {info && (
        <div className="space-y-6">
          <section className="rounded-2xl border border-brand-50 bg-white p-6 shadow-sm" aria-labelledby="judul-akun">
            <h2 id="judul-akun" className="font-display text-lg font-bold text-ink mb-4">
              Akun
            </h2>
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-[10rem_1fr]">
              <dt className="text-ink-muted">Nama</dt>
              <dd className="font-semibold text-ink">{info.akun.nama}</dd>
              <dt className="text-ink-muted">Email</dt>
              <dd className="font-semibold text-ink break-all">{info.akun.email}</dd>
              <dt className="text-ink-muted">Peran</dt>
              <dd className="font-semibold text-ink">{ROLE_LABEL[info.akun.role] ?? info.akun.role}</dd>
              <dt className="text-ink-muted">Login terakhir</dt>
              <dd className="font-semibold text-ink">{tanggal(info.akun.lastLoginAt)}</dd>
            </dl>
          </section>

          <section className="rounded-2xl border border-brand-50 bg-white p-6 shadow-sm" aria-labelledby="judul-mfa">
            <h2 id="judul-mfa" className="font-display text-lg font-bold text-ink mb-4">
              Verifikasi dua langkah (MFA)
            </h2>
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-[10rem_1fr] mb-6">
              <dt className="text-ink-muted">Status</dt>
              <dd>
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                    info.mfa.aktif ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}
                >
                  {info.mfa.aktif ? 'Aktif' : 'Belum aktif'}
                </span>
              </dd>
              <dt className="text-ink-muted">Diaktifkan</dt>
              <dd className="font-semibold text-ink">{tanggal(info.mfa.diaktifkanPada)}</dd>
              <dt className="text-ink-muted">Kode pemulihan tersisa</dt>
              <dd className="font-semibold text-ink">{info.mfa.sisaKodePemulihan} dari 10</dd>
            </dl>

            {info.mfa.aktif && info.mfa.sisaKodePemulihan <= 3 && (
              <div className="mb-6">
                <PesanInfo>
                  {info.mfa.sisaKodePemulihan === 0
                    ? 'Kode pemulihan Anda sudah habis. Buat set baru sekarang agar tetap bisa masuk bila HP hilang.'
                    : 'Kode pemulihan Anda hampir habis. Sebaiknya buat set baru.'}
                </PesanInfo>
              </div>
            )}

            <h3 className="font-semibold text-ink">Buat ulang kode pemulihan</h3>
            <p className="text-sm text-ink-muted mt-1 mb-4">
              Membuat 10 kode baru. Semua kode lama langsung tidak berlaku. Masukkan kode 6 digit dari aplikasi
              authenticator untuk melanjutkan.
            </p>

            <form onSubmit={onSubmit} className="space-y-4 max-w-sm" noValidate>
              <div>
                <label htmlFor="kode-akun" className={kelasLabel}>
                  Kode 6 digit dari aplikasi
                </label>
                <input
                  id="kode-akun"
                  ref={inputRef}
                  value={kode}
                  onChange={(e) => setKode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  aria-invalid={err ? true : undefined}
                  aria-describedby={err ? 'galat-akun' : undefined}
                  placeholder="123456"
                  className={`${kelasInput} text-center font-mono text-lg tracking-[0.3em]`}
                />
              </div>
              <PesanGalat pesan={err} id="galat-akun" />
              <TombolUtama loading={loading} disabled={!info.mfa.aktif}>
                Buat ulang kode pemulihan
              </TombolUtama>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
