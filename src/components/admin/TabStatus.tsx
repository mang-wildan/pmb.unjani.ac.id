'use client';

import { useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/cn';

// Tab "Berjalan & akan datang" / "Arsip" untuk halaman modul admin (FR-69 s.d. FR-73).
// - Pola WAI-ARIA tabs: tablist, aria-selected, panah kiri/kanan, fokus berpindah (roving).
// - Tab aktif tercermin di URL (?tab=arsip). Tab bawaan tidak menulis parameter, sehingga
//   tautan dari notifikasi dan dashboard selalu membuka tab bawaan (FR-73).
// - Memakai history/popstate langsung, bukan useSearchParams: halaman admin ini komponen klien
//   dan useSearchParams mewajibkan batas Suspense saat build. Render awal selalu tab bawaan
//   (aman untuk server), lalu parameter URL dibaca setelah mount.

export type TabItem = { id: string; label: string; jumlah?: number };

function bacaTab(ids: string[], bawaan: string): string {
  const nilai = new URLSearchParams(window.location.search).get('tab');
  return nilai && ids.includes(nilai) ? nilai : bawaan;
}

/** Tab aktif yang disinkronkan dengan ?tab=. Tombol kembali browser mengembalikan tab sebelumnya. */
export function useTabUrl(ids: string[], bawaan: string): [string, (id: string) => void] {
  const [aktif, setAktif] = useState(bawaan);
  const kunciIds = ids.join('|');

  useEffect(() => {
    const daftar = kunciIds.split('|');
    setAktif(bacaTab(daftar, bawaan));
    const saatKembali = () => setAktif(bacaTab(daftar, bawaan));
    window.addEventListener('popstate', saatKembali);
    return () => window.removeEventListener('popstate', saatKembali);
  }, [kunciIds, bawaan]);

  const pilih = useCallback(
    (id: string) => {
      setAktif(id);
      const url = new URL(window.location.href);
      if (id === bawaan) url.searchParams.delete('tab');
      else url.searchParams.set('tab', id);
      window.history.pushState(null, '', url.pathname + url.search + url.hash);
    },
    [bawaan],
  );

  return [aktif, pilih];
}

/** Atribut untuk panel yang dikendalikan tab: sambungkan ke TabStatus lewat `idDasar`. */
export function panelTab(idDasar: string, id: string, aktif: string) {
  return {
    role: 'tabpanel' as const,
    id: `${idDasar}-panel-${id}`,
    'aria-labelledby': `${idDasar}-tab-${id}`,
    hidden: id !== aktif,
  };
}

export default function TabStatus({
  idDasar,
  label,
  tabs,
  aktif,
  onPilih,
  className,
}: {
  idDasar: string;
  label: string;
  tabs: TabItem[];
  aktif: string;
  onPilih: (id: string) => void;
  className?: string;
}) {
  const pindah = (arah: 1 | -1, dari: number) => {
    const ke = (dari + arah + tabs.length) % tabs.length;
    onPilih(tabs[ke].id);
    requestAnimationFrame(() => document.getElementById(`${idDasar}-tab-${tabs[ke].id}`)?.focus());
  };

  return (
    <div role="tablist" aria-label={label} className={cn('mb-4 flex flex-wrap gap-1 border-b border-brand-100', className)}>
      {tabs.map((t, i) => {
        const terpilih = t.id === aktif;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`${idDasar}-tab-${t.id}`}
            aria-selected={terpilih}
            aria-controls={terpilih ? `${idDasar}-panel-${t.id}` : undefined}
            tabIndex={terpilih ? 0 : -1}
            onClick={() => onPilih(t.id)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') {
                e.preventDefault();
                pindah(1, i);
              } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                pindah(-1, i);
              }
            }}
            className={cn(
              '-mb-px inline-flex min-h-11 items-center gap-2 border-b-[3px] px-3.5 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/25',
              terpilih ? 'border-brand-700 text-ink' : 'border-transparent text-ink-muted hover:text-ink',
            )}
          >
            {t.label}
            {t.jumlah !== undefined && (
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums',
                  terpilih ? 'bg-brand-50 text-brand-700' : 'bg-gray-100 text-ink-muted',
                )}
              >
                {t.jumlah}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
