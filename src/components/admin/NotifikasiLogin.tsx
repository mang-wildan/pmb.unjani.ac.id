'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { ButirNotifikasi } from '@/lib/notifikasi';
import { cn } from '@/lib/cn';

// Modal "Perlu perhatian" setelah login (FR-63). Memuat butir Kritis lalu Peringatan; butir Info
// hanya di dashboard. Memakai <dialog> bawaan: fokus terkunci di dalam dan Escape menutup.
// Keputusan tampil atau tidaknya ada di AdminShell; komponen ini hanya menyajikan.

type Props = {
  butir: ButirNotifikasi[];
  nama: string;
  onTutup: () => void;
};

const TINGKAT = {
  kritis: { label: 'Kritis', chip: 'bg-red-50 text-red-700', garis: 'bg-red-600', bar: 'bg-red-600' },
  peringatan: { label: 'Peringatan', chip: 'bg-amber-50 text-amber-800', garis: 'bg-amber-500', bar: 'bg-amber-500' },
  info: { label: 'Info', chip: 'bg-sky-50 text-sky-700', garis: 'bg-sky-500', bar: 'bg-sky-500' },
} as const;

export default function NotifikasiLogin({ butir, nama, onTutup }: Props) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  // Tanpa pembersihan yang menutup dialog: close() memicu onClose dan mengosongkan state, sehingga
  // mode ketat React (mount dua kali di dev) menghapus modal. Saat komponen dilepas, elemen ikut hilang.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const tutup = () => dialogRef.current?.close();
  const buka = (href: string) => {
    tutup();
    router.push(href);
  };

  const tanggal = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <dialog
      ref={dialogRef}
      onClose={onTutup}
      aria-labelledby="notifikasi-judul"
      className="m-auto w-[min(560px,calc(100vw-2rem))] max-h-[min(90dvh,720px)] overflow-hidden rounded-2xl border border-brand-100 bg-white p-0 text-ink shadow-2xl backdrop:bg-ink/55"
    >
      <div className="flex max-h-[min(90dvh,720px)] flex-col">
        <div className="flex items-center gap-3 border-b border-brand-100 px-5 py-4">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-red-50 text-xl font-extrabold text-red-700" aria-hidden="true">
            !
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="notifikasi-judul" className="font-display text-lg font-bold">Perlu perhatian</h2>
            <p className="truncate text-xs text-ink-muted">{nama} · {tanggal}</p>
          </div>
          <span className="flex-none rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-ink-muted">{butir.length} butir</span>
        </div>

        <ul className="min-h-0 flex-1 overflow-y-auto">
          {butir.map((b) => {
            const t = TINGKAT[b.tingkat];
            const persen = b.progres && b.progres.total > 0 ? Math.round((b.progres.nilai / b.progres.total) * 100) : null;
            return (
              <li key={b.id} className="grid grid-cols-[4px_minmax(0,1fr)] gap-4 border-b border-brand-100 px-5 py-4 last:border-b-0">
                <span className={cn('rounded', t.garis)} aria-hidden="true" />
                <div className="min-w-0 space-y-2">
                  <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide', t.chip)}>{t.label}</span>
                  <h3 className="text-[15px] font-bold leading-snug">{b.judul}</h3>
                  <p className="text-sm leading-relaxed text-ink-muted">{b.teks}</p>
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    {persen !== null && (
                      <>
                        <div
                          className="h-2 min-w-[120px] flex-1 overflow-hidden rounded-full bg-brand-50"
                          role="img"
                          aria-label={`${persen} persen prodi sudah punya biaya`}
                        >
                          <div className={cn('h-full rounded-full', t.bar)} style={{ width: `${persen}%` }} />
                        </div>
                        <span className="text-xs font-bold tabular-nums text-ink-muted">{persen}%</span>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => buka(b.href)}
                      className={cn(
                        'ml-auto inline-flex min-h-9 items-center rounded-lg px-3.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/25',
                        b.tingkat === 'kritis' ? 'bg-brand-700 text-white hover:bg-brand-800' : 'border border-brand-200 text-brand-700 hover:bg-brand-50',
                      )}
                    >
                      {b.labelAksi} →
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-100 bg-brand-50/50 px-5 py-4">
          <p className="max-w-[36ch] text-xs text-ink-muted">
            Muncul lagi saat login berikutnya selama masih ada butir kritis. Semua notifikasi juga ada di dashboard.
          </p>
          <button
            type="button"
            onClick={() => buka('/admin')}
            className="inline-flex min-h-10 items-center rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/25"
          >
            Mengerti, ke dashboard
          </button>
        </div>
      </div>
    </dialog>
  );
}
