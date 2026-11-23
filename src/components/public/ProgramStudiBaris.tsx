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

  // FR-46: pilih prodi ini di kalkulator lalu gulir ke sana (logika sama dengan T-63).
  const hitungBiaya = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    kirimPilihProdi(prodi._id);
    document
      .getElementById('kalkulator')
      ?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <li
      data-flip-key={prodi._id}
      hidden={hidden}
      className="rounded-lg border border-ln/70 bg-white p-4 shadow-soft transition hover:border-brand-300 md:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h4 className="font-display text-base font-bold leading-snug text-ink sm:text-lg">
              {prodi.nama}
            </h4>
            {prodi.singkatan && (
              <abbr
                className="notranslate rounded-md bg-gray-100 px-1.5 py-0.5 text-[11px] font-semibold text-ink-muted no-underline"
                translate="no"
                title={prodi.nama}
              >
                {prodi.singkatan}
              </abbr>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-ink-muted">
            <span className="font-semibold text-brand-700">{prodi.jenjang}</span>
            {prodi.akreditasi && (
              <>
                <span aria-hidden="true" className="text-ln">·</span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="sr-only">{t('akreditasi')}: </span>
                  <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-bold', kelasAkreditasi(prodi.akreditasi))}>
                    {t('akreditasi')} {prodi.akreditasi}
                  </span>
                </span>
              </>
            )}
            {tampilkanFakultas && prodi.fakultas_id.nama && (
              <>
                <span aria-hidden="true" className="text-ln">·</span>
                <span className="inline-flex items-center gap-1.5">
                  <i className="fa-solid fa-building-columns text-[0.65rem]" aria-hidden="true" />
                  {prodi.fakultas_id.nama}
                </span>
              </>
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

        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          {prodi.hasAkreditasiFile && (
            <a
              href={`/api/program-studi/${prodi._id}/akreditasi?download=1`}
              download
              aria-label={t('sertifikatLabel', { nama: prodi.nama })}
              title={t('sertifikatLabel', { nama: prodi.nama })}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-brand-200 bg-white px-2.5 text-xs font-semibold text-brand-700 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/25"
            >
              <i className="fa-solid fa-file-arrow-down text-[0.7rem]" aria-hidden="true" />
              <span>{t('sertifikat')}</span>
            </a>
          )}
          {prodi.punyaBiaya && (
            <a
              href="#kalkulator"
              onClick={hitungBiaya}
              className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-brand hover:text-brand-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/25"
            >
              <span>{t('hitungBiaya')} →</span>
            </a>
          )}
        </div>
      </div>
    </li>
  );
}
