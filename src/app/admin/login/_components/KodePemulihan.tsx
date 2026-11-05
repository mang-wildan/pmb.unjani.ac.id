'use client';

import { useEffect, useRef, useState } from 'react';
import { PesanInfo, TombolUtama, salinTeks } from './shared';

// Kode pemulihan ditampilkan SEKALI setelah MFA aktif (FR-08). Server tidak menyimpan kode polos,
// jadi pengguna wajib menyalin atau mengunduhnya dan mengonfirmasi sebelum lanjut.

const PESAN_TINGGALKAN = 'Kode pemulihan belum disimpan dan tidak bisa ditampilkan lagi. Tetap tinggalkan halaman ini?';

export default function KodePemulihan({
  kode,
  email,
  onLanjut,
  tombolLanjut = 'Lanjut ke dashboard',
}: {
  kode: string[];
  email: string;
  onLanjut: () => void;
  tombolLanjut?: string;
}) {
  const [sudahSimpan, setSudahSimpan] = useState(false);
  const [statusSalin, setStatusSalin] = useState<string | null>(null);
  const [lanjut, setLanjut] = useState(false);
  const judulRef = useRef<HTMLHeadingElement>(null);

  // Langkah baru: pindahkan fokus ke judul agar pembaca layar mengumumkan perubahan.
  useEffect(() => {
    judulRef.current?.focus();
  }, []);

  // Kode tidak bisa dilihat lagi. Peringatkan sebelum tab ditutup/dimuat ulang (beforeunload) dan
  // sebelum tombol Back browser (navigasi App Router tidak memicu beforeunload).
  useEffect(() => {
    if (sudahSimpan) return;
    const cegahTutup = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    // Entri riwayat penjaga memakai state Next.js yang sama, sehingga router menganggapnya halaman ini.
    window.history.pushState(window.history.state, '', window.location.href);
    const cegahKembali = () => {
      if (window.confirm(PESAN_TINGGALKAN)) {
        window.removeEventListener('popstate', cegahKembali);
        window.history.back();
      } else {
        window.history.pushState(window.history.state, '', window.location.href);
      }
    };
    window.addEventListener('beforeunload', cegahTutup);
    window.addEventListener('popstate', cegahKembali);
    return () => {
      window.removeEventListener('beforeunload', cegahTutup);
      window.removeEventListener('popstate', cegahKembali);
    };
  }, [sudahSimpan]);

  const isiTeks = () =>
    [
      'Kode pemulihan MFA — Admin PMB UNJANI',
      `Akun: ${email}`,
      `Dibuat: ${new Date().toLocaleString('id-ID')}`,
      '',
      'Setiap kode hanya bisa dipakai SATU kali, sebagai pengganti kode dari aplikasi authenticator.',
      'Simpan di tempat aman dan jangan bagikan ke siapa pun.',
      '',
      ...kode.map((k, i) => `${String(i + 1).padStart(2, ' ')}. ${k}`),
      '',
    ].join('\r\n');

  async function salin() {
    const ok = await salinTeks(kode.join('\n'));
    setStatusSalin(ok ? 'Kode pemulihan tersalin ke clipboard.' : 'Gagal menyalin. Gunakan Unduh .txt atau catat manual.');
    window.setTimeout(() => setStatusSalin(null), 3000);
  }

  function unduh() {
    // Berkas dibuat di browser; kode tidak dikirim ulang ke server mana pun.
    const url = URL.createObjectURL(new Blob([isiTeks()], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kode-pemulihan-pmb-unjani.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 ref={judulRef} tabIndex={-1} className="font-display text-2xl font-bold text-ink outline-none">
          Simpan kode pemulihan
        </h2>
        <p className="text-sm text-ink-muted mt-1">
          Verifikasi dua langkah sudah aktif. Jika HP Anda hilang atau aplikasi terhapus, pakai salah satu kode ini untuk
          masuk. Kode hanya ditampilkan <strong>sekali ini</strong>.
        </p>
      </div>

      <ul
        aria-label="Kode pemulihan"
        className="grid grid-cols-2 gap-2 rounded-2xl border border-gray-200 bg-white p-4 font-mono text-sm text-ink"
      >
        {kode.map((k) => (
          <li key={k} className="rounded-lg bg-gray-50 px-3 py-2 text-center tracking-wide">
            {k}
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => void salin()}
          className="rounded-full border border-gray-200 bg-white py-2.5 text-sm font-semibold text-ink hover:bg-gray-50"
        >
          Salin semua
        </button>
        <button
          type="button"
          onClick={unduh}
          className="rounded-full border border-gray-200 bg-white py-2.5 text-sm font-semibold text-ink hover:bg-gray-50"
        >
          Unduh .txt
        </button>
      </div>
      <p role="status" className="-mt-2 min-h-[1rem] text-xs text-ink-muted">
        {statusSalin}
      </p>

      <PesanInfo>Setiap kode hanya berlaku satu kali. Jangan simpan di HP yang sama dengan aplikasi authenticator.</PesanInfo>

      <label className="flex items-start gap-3 text-sm text-ink cursor-pointer">
        <input
          type="checkbox"
          checked={sudahSimpan}
          onChange={(e) => setSudahSimpan(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand/30"
        />
        <span>Saya sudah menyimpan kode pemulihan ini di tempat yang aman.</span>
      </label>

      <TombolUtama
        type="button"
        disabled={!sudahSimpan}
        loading={lanjut}
        onClick={() => {
          setLanjut(true);
          onLanjut();
        }}
      >
        {tombolLanjut}
      </TombolUtama>
    </div>
  );
}
