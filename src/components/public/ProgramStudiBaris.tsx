'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/cn';
import { kirimPilihProdi } from '@/lib/pilihProdi';
import { prefersReducedMotion } from '@/lib/useReducedMotion';

// Satu baris program studi (FR-57, menggantikan kartu): pil jenjang, nama, singkatan, chip
// akreditasi, lalu aksi yang hanya tampil bila ada (unduh sertifikat, Hitung biaya, persyaratan).
// Persyaratan memakai <details>/<summary> sehingga berfungsi tanpa JavaScript.

export type ProgramStudiItem = {
  _id: string;
  nama: string;
  singkatan: string;
  jenjang: string;
  jenjangWarna?: string;
  akreditasi?: string;
  persyaratan?: string[];
  punyaBiaya?: boolean;
  hasAkreditasiFile?: boolean;
  fakultas_id: { _id: string; nama: string; singkatan: string };
};

const PIL_JENJANG: Record<string, string> = {
  S1: 'bg-brand-50 text-brand-700',
  S2: 'bg-emerald-50 text-emerald-700',
  S3: 'bg-blue-50 text-blue-700',
  D3: 'bg-violet-50 text-violet-700',
  D4: 'bg-indigo-50 text-indigo-700',
};

// Warna chip akreditasi konsisten per tingkat (FR-57). Nilai lain memakai abu.
function kelasAkreditasi(nilai: string): string {
  const v = nilai.trim().toLowerCase();
  if (v === 'unggul' || v === 'a') return 'bg-emerald-50 text-emerald-800';
  if (v === 'baik sekali' || v === 'b') return 'bg-sky-50 text-sky-800';
  if (v === 'baik' || v === 'c') return 'bg-amber-50 text-amber-800';
  return 'bg-gray-100 text-gray-700';
}

export default function ProgramStudiBaris({
  prodi,
  tampilkanFakultas = false,
  hidden = false,
}: {
  prodi: ProgramStudiItem;
  /** Tampilkan nama fakultas di bawah nama prodi (tampilan lintas fakultas). */
  tampilkanFakultas?: boolean;
  /** Disembunyikan oleh penyaring; elemen tetap ada di DOM (FR-42). */
  hidden?: boolean;
}) {
  const t = useTranslations('prodiExplorer');
  const syarat = prodi.persyaratan ?? [];
  const pil = PIL_JENJANG[prodi.jenjang] ?? 'bg-amber-50 text-amber-700';

  // FR-46: pilih prodi ini di kalkulator lalu gulir ke sana (logika sama dengan T-63).
  const hitungBiaya = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    kirimPilihProdi(prodi._id);
    document
      .getElementById('kalkulator')
      ?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <li data-flip-key={prodi._id} hidden={hidden} className="border-b border-brand-100 last:border-b-0">
      <div className="flex items-start gap-3 py-2.5 sm:items-center">
        <span
          translate="no"
          className={cn(
            'notranslate mt-0.5 inline-flex h-7 min-w-10 flex-none items-center justify-center rounded-full px-2 text-[11px] font-bold uppercase tracking-wide sm:mt-0',
            pil,
          )}
        >
          {prodi.jenjang}
        </span>

        <div className="min-w-0 flex-1">
          {/* h4: di bawah h3 judul panel dan h4 judul kelompok fakultas (hierarki tidak terbalik). */}
          <h4 className="text-sm font-bold leading-snug text-ink sm:text-[15px]">
            {prodi.nama}
            {prodi.singkatan && (
              <>
                {' '}
                <abbr
                  className="notranslate ml-1 rounded-md bg-gray-100 px-1.5 py-0.5 align-middle text-[11px] font-semibold text-ink-muted no-underline"
                  translate="no"
                  title={prodi.nama}
                >
                  {prodi.singkatan}
                </abbr>
              </>
            )}
          </h4>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
            {tampilkanFakultas && prodi.fakultas_id.nama && (
              <span className="inline-flex items-center gap-1.5">
                <i className="fa-solid fa-building-columns text-[0.65rem]" aria-hidden="true" />
                {prodi.fakultas_id.nama}
              </span>
            )}
            {prodi.akreditasi && (
              <span className="inline-flex items-center gap-1.5">
                <span className="sr-only">{t('akreditasi')}: </span>
                <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-bold', kelasAkreditasi(prodi.akreditasi))}>
                  {prodi.akreditasi}
                </span>
              </span>
            )}
            {syarat.length > 0 && (
              <details className="detail-persyaratan group inline">
                <summary className="inline-flex min-h-8 cursor-pointer list-none items-center gap-1 rounded-md text-xs font-semibold text-brand-700 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 [&::-webkit-details-marker]:hidden">
                  {t('persyaratan', { n: syarat.length })}
                  <svg width="12" height="12" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="transition-transform duration-300 group-open:rotate-180 motion-reduce:transition-none">
                    <path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </summary>
                <ol className="mt-1 space-y-1 pb-1 text-xs text-ink">
                  {syarat.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[0.6rem] font-bold text-brand-800" aria-hidden="true">
                        {idx + 1}
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ol>
              </details>
            )}
          </div>
        </div>

        {(prodi.hasAkreditasiFile || prodi.punyaBiaya) && (
          <div className="flex flex-none flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-2">
            {prodi.hasAkreditasiFile && (
              <a
                href={`/api/program-studi/${prodi._id}/akreditasi?download=1`}
                download
                aria-label={t('sertifikatLabel', { nama: prodi.nama })}
                title={t('sertifikatLabel', { nama: prodi.nama })}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-brand-200 px-2.5 text-xs font-semibold text-brand-700 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/25"
              >
                <i className="fa-solid fa-file-arrow-down text-[0.7rem]" aria-hidden="true" />
                <span className="hidden sm:inline">{t('sertifikat')}</span>
              </a>
            )}
            {prodi.punyaBiaya && (
              <a
                href="#kalkulator"
                onClick={hitungBiaya}
                className="inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-lg bg-brand-50 px-2.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/25"
              >
                <i className="fa-solid fa-calculator text-[0.7rem]" aria-hidden="true" />
                {t('hitungBiaya')}
              </a>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
