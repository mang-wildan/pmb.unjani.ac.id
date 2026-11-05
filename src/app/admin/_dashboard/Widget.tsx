import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

// Bingkai widget dashboard (FR-65, FR-66): judul dan keterangan di kepala, isi, dan tautan
// "Lihat semua" selalu di kanan bawah. Keadaan kosong menyebut apa yang belum ada.

export function Widget({
  judul,
  keterangan,
  href,
  kosong,
  className,
  children,
}: {
  judul: string;
  keterangan?: string;
  /** Tujuan "Lihat semua →"; tanpa href, kaki widget tidak dirender. */
  href?: string;
  /** Pesan keadaan kosong; bila diisi, menggantikan children. */
  kosong?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <section className={cn('flex min-w-0 flex-col rounded-2xl border border-brand-100 bg-white shadow-soft', className)}>
      <div className="px-5 pb-2 pt-4">
        <h2 className="font-display text-lg font-bold text-ink">{judul}</h2>
        {keterangan && <p className="mt-0.5 text-xs text-ink-muted">{keterangan}</p>}
      </div>
      <div className="min-w-0 flex-1 px-5">
        {kosong ? <p className="py-6 text-center text-sm text-ink-muted">{kosong}</p> : children}
      </div>
      {href && (
        <div className="flex justify-end px-5 pb-4 pt-3">
          <Link
            href={href}
            className="inline-flex min-h-8 items-center text-sm font-semibold text-brand-700 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/25"
          >
            Lihat semua →
          </Link>
        </div>
      )}
    </section>
  );
}
