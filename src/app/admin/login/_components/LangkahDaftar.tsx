'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  PesanGalat,
  PesanInfo,
  Spinner,
  TombolTeks,
  TombolUtama,
  kelasInput,
  kelasLabel,
  kembaliDari,
  panggilApi,
  salinTeks,
  type HasilKembali,
} from './shared';

// Pendaftaran MFA wajib (FR-06): pindai QR atau ketik kunci manual, lalu masukkan satu kode.

type DataDaftar = {
  qr: string;
  uri: string;
  kunciManual: string;
  akun: string;
  berlakuSampai: string | null;
};

export default function LangkahDaftar({
  onSelesai,
  onKembali,
  onBatal,
}: {
  onSelesai: (kodePemulihan: string[]) => void;
  onKembali: (hasil: HasilKembali) => void;
  /** Pengguna membatalkan: halaman menghapus cookie pre-auth lalu kembali ke email & password. */
  onBatal: () => void;
}) {
  const [data, setData] = useState<DataDaftar | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [errMuat, setErrMuat] = useState<string | null>(null);
  const [kode, setKode] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [statusSalin, setStatusSalin] = useState<string | null>(null);
  const urutan = useRef(0);
  const sudahDimuat = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Setiap GET membuat rahasia baru di server; hanya jawaban permintaan TERAKHIR yang ditampilkan.
  const muat = useCallback(async () => {
    const ke = ++urutan.current;
    setMemuat(true);
    setErrMuat(null);
    setErr(null);
    setKode('');
    const j = await panggilApi('/api/auth/mfa/daftar');
    if (ke !== urutan.current) return;
    setMemuat(false);
    if (j.ok) {
      setData(j.data as unknown as DataDaftar);
      return;
    }
    setData(null);
    const kembali = kembaliDari(j);
    if (kembali) {
      onKembali(kembali);
      return;
    }
    setErrMuat(String(j.data.error || 'Gagal memuat kode QR. Coba lagi.'));
  }, [onKembali]);

  useEffect(() => {
    // Cegah GET ganda (React StrictMode menjalankan efek dua kali di mode dev).
    if (sudahDimuat.current) return;
    sudahDimuat.current = true;
    void muat();
  }, [muat]);

  useEffect(() => {
    if (data) inputRef.current?.focus();
  }, [data]);

  async function salinKunci() {
    if (!data) return;
    const ok = await salinTeks(data.kunciManual.replace(/\s/g, ''));
    setStatusSalin(ok ? 'Kunci tersalin ke clipboard.' : 'Gagal menyalin. Ketik kunci secara manual.');
    window.setTimeout(() => setStatusSalin(null), 3000);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || !data) return;
    setErr(null);
    if (!/^\d{6}$/.test(kode)) {
      setErr('Masukkan 6 digit kode yang tampil di aplikasi authenticator.');
      return;
    }
    setLoading(true);
    const j = await panggilApi('/api/auth/mfa/daftar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kode }),
    });
    if (j.ok && Array.isArray(j.data.kodePemulihan)) {
      onSelesai(j.data.kodePemulihan.map(String));
      return;
    }
    setLoading(false);
    const kembali = kembaliDari(j);
    if (kembali) {
      onKembali(kembali);
      return;
    }
    if (j.status === 409) {
      // Rahasia diganti dari tab/sesi lain atau aktivasi bersamaan: tampilkan QR baru.
      await muat();
      setErr('Kode QR sebelumnya sudah tidak berlaku. Hapus entri lama di aplikasi, pindai QR baru ini, lalu masukkan kodenya.');
      return;
    }
    setKode('');
    setErr(String(j.data.error || 'Verifikasi gagal. Coba lagi.'));
    inputRef.current?.focus();
  }

  const batas = data?.berlakuSampai
    ? new Date(data.berlakuSampai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-bold text-ink">Aktifkan verifikasi dua langkah</h2>
        <p className="text-sm text-ink-muted mt-1">
          Mulai versi ini, setiap akun admin wajib memakai aplikasi authenticator saat masuk.
        </p>
      </div>

      <ol className="space-y-1.5 text-sm text-ink list-decimal pl-5">
        <li>Pasang Google Authenticator atau Microsoft Authenticator di HP Anda.</li>
        <li>Di aplikasi, pilih tambah akun lalu pindai kode QR di bawah.</li>
        <li>Masukkan 6 digit kode yang muncul di aplikasi.</li>
      </ol>

      {memuat && (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-ink-muted" role="status">
          <Spinner />
          Menyiapkan kode QR...
        </div>
      )}

      {!memuat && errMuat && (
        <div className="space-y-3">
          <PesanGalat pesan={errMuat} />
          <TombolUtama type="button" onClick={() => void muat()}>
            Coba lagi
          </TombolUtama>
        </div>
      )}

      {!memuat && data && (
        <>
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL dari server, tidak perlu optimasi next/image */}
            <img src={data.qr} alt={`Kode QR untuk menambahkan akun ${data.akun} ke aplikasi authenticator`} width={200} height={200} />
            <a href={data.uri} className="text-xs font-semibold text-brand hover:underline lg:hidden">
              Membuka di HP ini? Ketuk untuk membuka aplikasi authenticator
            </a>
            <div className="w-full">
              <p className="text-xs text-ink-muted mb-1">Tidak bisa memindai? Ketik kunci ini di aplikasi (jenis: berbasis waktu):</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all rounded-lg bg-gray-50 px-3 py-2 font-mono text-sm text-ink" aria-label="Kunci manual">
                  {data.kunciManual}
                </code>
                <button
                  type="button"
                  onClick={() => void salinKunci()}
                  className="shrink-0 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-ink hover:bg-gray-50"
                >
                  Salin
                </button>
              </div>
              <p role="status" className="mt-1 min-h-[1rem] text-xs text-ink-muted">
                {statusSalin}
              </p>
            </div>
          </div>

          <PesanInfo>
            {batas && <>Selesaikan sebelum pukul {batas}; setelah itu Anda perlu masuk ulang dan memindai QR baru. </>}
            Jika sebelumnya sudah memindai QR PMB UNJANI untuk akun ini, hapus entri lama itu di aplikasi lalu pindai
            QR ini.
          </PesanInfo>

          <form onSubmit={onSubmit} className="space-y-5" noValidate>
            <div>
              <label htmlFor="kode-daftar" className={kelasLabel}>
                Kode 6 digit dari aplikasi
              </label>
              <input
                id="kode-daftar"
                ref={inputRef}
                value={kode}
                onChange={(e) => setKode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                aria-invalid={err ? true : undefined}
                aria-describedby={err ? 'galat-daftar' : undefined}
                placeholder="123456"
                className={`${kelasInput} text-center font-mono text-lg tracking-[0.3em]`}
              />
            </div>
            <PesanGalat pesan={err} id="galat-daftar" />
            <TombolUtama loading={loading}>Aktifkan &amp; masuk</TombolUtama>
          </form>
        </>
      )}

      <div className="flex justify-center">
        <TombolTeks onClick={onBatal}>Kembali ke email &amp; password</TombolTeks>
      </div>
    </div>
  );
}
