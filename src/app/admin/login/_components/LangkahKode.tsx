'use client';

import { useEffect, useRef, useState } from 'react';
import { PesanGalat, TombolTeks, TombolUtama, kelasInput, kelasLabel, kembaliDari, panggilApi, type HasilKembali } from './shared';

// Langkah 2 login (FR-07, FR-08): kode 6 digit dari aplikasi authenticator, atau kode pemulihan.

export default function LangkahKode({
  email,
  onSukses,
  onKembali,
  onBatal,
}: {
  email: string;
  onSukses: (sisaKodePemulihan: number | null) => void;
  onKembali: (hasil: HasilKembali) => void;
  /** Pengguna membatalkan: halaman menghapus cookie pre-auth lalu kembali ke email & password. */
  onBatal: () => void;
}) {
  const [pakaiPemulihan, setPakaiPemulihan] = useState(false);
  const [kode, setKode] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [pakaiPemulihan]);

  function gantiMode() {
    setPakaiPemulihan((v) => !v);
    setKode('');
    setErr(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setErr(null);
    const bersih = kode.trim();
    if (!pakaiPemulihan && !/^\d{6}$/.test(bersih.replace(/\s/g, ''))) {
      setErr('Masukkan 6 digit kode dari aplikasi authenticator.');
      return;
    }
    if (pakaiPemulihan && bersih.replace(/[\s-]/g, '').length !== 10) {
      setErr('Kode pemulihan terdiri dari 10 karakter (contoh: ab12c-de34f).');
      return;
    }
    setLoading(true);
    const j = await panggilApi('/api/auth/mfa/verifikasi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kode: bersih }),
    });
    if (j.ok) {
      // Tetap "loading" sampai halaman berpindah, agar tombol tidak ditekan dua kali.
      onSukses(typeof j.data.sisaKodePemulihan === 'number' ? j.data.sisaKodePemulihan : null);
      return;
    }
    setLoading(false);
    const kembali = kembaliDari(j);
    if (kembali) {
      onKembali(kembali);
      return;
    }
    setKode('');
    setErr(String(j.data.error || 'Verifikasi gagal. Coba lagi.'));
    inputRef.current?.focus();
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-bold text-ink">Verifikasi dua langkah</h2>
        <p className="text-sm text-ink-muted mt-1">
          {pakaiPemulihan
            ? 'Masukkan salah satu kode pemulihan yang Anda simpan saat mendaftarkan MFA. Setiap kode hanya bisa dipakai sekali.'
            : 'Buka aplikasi authenticator (Google Authenticator atau Microsoft Authenticator) di HP Anda, lalu masukkan 6 digit kode untuk PMB UNJANI.'}
        </p>
        <p className="text-xs text-ink-muted mt-2">
          Akun: <span className="font-semibold text-ink">{email}</span>
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <div>
          <label htmlFor="kode-mfa" className={kelasLabel}>
            {pakaiPemulihan ? 'Kode pemulihan' : 'Kode 6 digit'}
          </label>
          <input
            id="kode-mfa"
            ref={inputRef}
            value={kode}
            onChange={(e) => {
              const v = e.target.value;
              if (!pakaiPemulihan) return setKode(v.replace(/\D/g, '').slice(0, 6));
              // Tempel dari berkas .txt (" 1. ab12c-de34f") atau "Salin semua": ambil kode pertama.
              const cocok = v.match(/[0-9a-z]{5}-?[0-9a-z]{5}/i);
              setKode(cocok ? cocok[0] : v.slice(0, 13));
            }}
            inputMode={pakaiPemulihan ? 'text' : 'numeric'}
            autoComplete={pakaiPemulihan ? 'off' : 'one-time-code'}
            autoCapitalize="off"
            spellCheck={false}
            aria-invalid={err ? true : undefined}
            aria-describedby={err ? 'galat-kode' : undefined}
            placeholder={pakaiPemulihan ? 'xxxxx-xxxxx' : '123456'}
            className={`${kelasInput} text-center font-mono text-lg tracking-[0.3em]`}
          />
        </div>

        <PesanGalat pesan={err} id="galat-kode" />

        <TombolUtama loading={loading}>Verifikasi</TombolUtama>
      </form>

      <div className="flex flex-col items-center gap-3">
        <TombolTeks onClick={gantiMode}>
          {pakaiPemulihan ? 'Pakai kode dari aplikasi authenticator' : 'Tidak bisa membuka aplikasi? Pakai kode pemulihan'}
        </TombolTeks>
        <TombolTeks onClick={onBatal}>Kembali ke email &amp; password</TombolTeks>
      </div>
    </div>
  );
}
