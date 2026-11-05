import Link from 'next/link';
import type { ButirNotifikasi, RingkasanNotifikasi } from '@/lib/notifikasi';
import { cn } from '@/lib/cn';
import { Icon } from './komponen';

// Strip ringkasan dan daftar butir notifikasi di dashboard (FR-64). Server component: data
// dihitung langsung dengan hitungNotifikasi, tanpa fetch.

const TINGKAT = {
  kritis: { label: 'Kritis', chip: 'bg-red-50 text-red-700', garis: 'bg-red-600', bar: 'bg-red-600' },
  peringatan: { label: 'Peringatan', chip: 'bg-amber-50 text-amber-800', garis: 'bg-amber-500', bar: 'bg-amber-500' },
  info: { label: 'Info', chip: 'bg-sky-50 text-sky-700', garis: 'bg-sky-500', bar: 'bg-sky-500' },
} as const;

/** Strip di bawah kepala halaman; warna mengikuti tingkat tertinggi. */
export function StripNotifikasi({ ringkasan }: { ringkasan: RingkasanNotifikasi }) {
  const total = ringkasan.kritis + ringkasan.peringatan + ringkasan.info;
  const tingkat = ringkasan.kritis > 0 ? 'kritis' : ringkasan.peringatan > 0 ? 'peringatan' : ringkasan.info > 0 ? 'info' : null;
  const gaya =
    tingkat === 'kritis'
      ? 'border-red-200 bg-red-50 text-red-800'
      : tingkat === 'peringatan'
        ? 'border-amber-200 bg-amber-50 text-amber-900'
        : tingkat === 'info'
          ? 'border-sky-200 bg-sky-50 text-sky-800'
          : 'border-brand-100 bg-brand-50 text-brand-700';
  return (
    <div role="status" className={cn('flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border px-5 py-3 text-sm font-semibold', gaya)}>
      <Icon name={tingkat ? 'warning' : 'check'} className="h-4 w-4 flex-none" />
      {total === 0 ? (
        <span>Semua indikator utama siap.</span>
      ) : (
        <>
          <span className="tabular-nums">
            {ringkasan.kritis} kritis · {ringkasan.peringatan} peringatan · {ringkasan.info} info
          </span>
          <a href="#notifikasi" className="ml-auto underline underline-offset-2">
            Lihat detail
          </a>
        </>
      )}
    </div>
  );
}

/** Daftar semua butir (termasuk Info), masing-masing dengan satu tombol aksi. */
export function DaftarNotifikasi({ butir }: { butir: ButirNotifikasi[] }) {
  if (butir.length === 0) {
    return (
      <div className="flex items-start gap-2 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-700">
        <Icon name="check" className="mt-0.5 h-4 w-4 flex-none" />
        Semua indikator utama siap.
      </div>
    );
  }
  return (
    <ul className="space-y-3">
      {butir.map((b) => {
        const t = TINGKAT[b.tingkat];
        const persen = b.progres && b.progres.total > 0 ? Math.round((b.progres.nilai / b.progres.total) * 100) : null;
        return (
          <li key={b.id} className="grid grid-cols-[4px_minmax(0,1fr)] gap-3 rounded-xl border border-brand-100 bg-white p-3">
            <span className={cn('rounded', t.garis)} aria-hidden="true" />
            <div className="min-w-0 space-y-1.5">
              <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide', t.chip)}>{t.label}</span>
              <p className="text-sm font-bold leading-snug text-ink">{b.judul}</p>
              <p className="text-xs leading-relaxed text-ink-muted">{b.teks}</p>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {persen !== null && (
                  <>
                    <div className="h-2 min-w-[100px] flex-1 overflow-hidden rounded-full bg-brand-50" role="img" aria-label={`${persen} persen prodi sudah punya biaya`}>
                      <div className={cn('h-full rounded-full', t.bar)} style={{ width: `${persen}%` }} />
                    </div>
                    <span className="text-xs font-bold tabular-nums text-ink-muted">{persen}%</span>
                  </>
                )}
                <Link
                  href={b.href}
                  className="ml-auto inline-flex min-h-8 items-center rounded-lg border border-brand-200 px-3 text-xs font-semibold text-brand-700 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/25"
                >
                  {b.labelAksi} →
                </Link>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
