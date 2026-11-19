'use client';

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/cn';
import { useReducedMotion } from '@/lib/useReducedMotion';

// Slideshow hero (FR-39, FR-40).
// - Semua gambar ditumpuk; yang aktif opacity 1, sisanya 0 (crossfade 700ms, tanpa remount).
// - Gambar pertama priority. Gambar lain baru dirender setelah gambar pertama selesai dimuat
//   (atau setelah 1,5 detik), dengan loading eager, dan pergantian otomatis hanya menuju gambar
//   yang sudah dimuat, sehingga tidak ada kedipan atau area kosong.
// - Interval 6 detik. Jeda: tombol jeda, pointer di atas slider, fokus di dalam slider, tab
//   tersembunyi. Reduced motion: tidak autoplay.
// - 1 gambar: tanpa kontrol. 0 gambar: gambar bawaan.

const INTERVAL_MS = 6000;
const AMBANG_GESER_PX = 40;
const GAMBAR_BAWAAN = '/pmb unjani.jpg';

export default function HeroSlider({
  images = [GAMBAR_BAWAAN],
  judul = '',
  fullBleed = false,
}: {
  images: string[];
  fullBleed?: boolean;
  /** Judul hero, dipakai untuk teks alternatif gambar. */
  judul?: string;
}) {
  const t = useTranslations('slideshow');
  const reduksi = useReducedMotion();
  const daftar = images.length > 0 ? images : [GAMBAR_BAWAAN];
  const jumlah = daftar.length;
  const banyak = jumlah > 1;

  const [aktif, setAktif] = useState(0);
  const [dijedaPengguna, setDijedaPengguna] = useState(false);
  const [diatasPointer, setDiatasPointer] = useState(false);
  const [adaFokus, setAdaFokus] = useState(false);
  const [tabTersembunyi, setTabTersembunyi] = useState(false);
  const [dimuat, setDimuat] = useState<ReadonlySet<number>>(() => new Set());
  const [lanjutMuat, setLanjutMuat] = useState(!banyak);

  const geser = useRef<{ x: number; y: number } | null>(null);

  const tandaiDimuat = useCallback((indeks: number) => {
    setDimuat((prev) => (prev.has(indeks) ? prev : new Set(prev).add(indeks)));
    if (indeks === 0) setLanjutMuat(true);
  }, []);

  // Jaring pengaman: bila onLoad gambar pertama tidak pernah terpanggil, gambar lain tetap dimuat.
  useEffect(() => {
    if (lanjutMuat) return;
    const id = setTimeout(() => setLanjutMuat(true), 1500);
    return () => clearTimeout(id);
  }, [lanjutMuat]);

  useEffect(() => {
    const ubah = () => setTabTersembunyi(document.hidden);
    ubah();
    document.addEventListener('visibilitychange', ubah);
    return () => document.removeEventListener('visibilitychange', ubah);
  }, []);

  const berikutnya = (aktif + 1) % jumlah;
  const berjalan =
    banyak && !reduksi && !dijedaPengguna && !diatasPointer && !adaFokus && !tabTersembunyi;
  const berikutnyaSiap = dimuat.has(berikutnya);

  useEffect(() => {
    if (!berjalan || !berikutnyaSiap) return;
    const id = setTimeout(() => setAktif(berikutnya), INTERVAL_MS);
    return () => clearTimeout(id);
  }, [berjalan, berikutnyaSiap, berikutnya, aktif]);

  const pindah = (arah: 1 | -1) => setAktif((prev) => (prev + arah + jumlah) % jumlah);

  const mulaiGeser = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!banyak || e.pointerType === 'mouse' || (e.target as HTMLElement).closest('button')) return;
    geser.current = { x: e.clientX, y: e.clientY };
  };
  const akhiriGeser = (e: ReactPointerEvent<HTMLDivElement>) => {
    const awal = geser.current;
    geser.current = null;
    if (!awal) return;
    const dx = e.clientX - awal.x;
    const dy = e.clientY - awal.y;
    if (Math.abs(dx) >= AMBANG_GESER_PX && Math.abs(dx) > Math.abs(dy)) pindah(dx < 0 ? 1 : -1);
  };

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={t('wilayah')}
      className="relative w-full h-full touch-pan-y"
      onPointerEnter={(e) => e.pointerType === 'mouse' && setDiatasPointer(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setDiatasPointer(false)}
      onFocus={() => setAdaFokus(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setAdaFokus(false);
      }}
      onPointerDown={mulaiGeser}
      onPointerUp={akhiriGeser}
      onPointerCancel={() => (geser.current = null)}
    >
      <div
        className={cn(
          'relative bg-gradient-to-br from-brand to-brand-700 overflow-hidden',
          fullBleed ? 'h-full w-full' : 'aspect-[4/3]',
        )}
        aria-live={berjalan ? 'off' : 'polite'}
      >
        {daftar.map((src, indeks) => {
          if (indeks > 0 && !lanjutMuat) return null;
          const tampil = indeks === aktif;
          return (
            <Image
              key={src}
              src={src}
              alt={banyak ? t('gambarAlt', { judul, n: indeks + 1 }) : judul}
              aria-hidden={!tampil}
              fill
              draggable={false}
              priority={indeks === 0}
              fetchPriority={indeks === 0 ? 'high' : undefined}
              loading={indeks === 0 ? undefined : 'eager'}
              sizes={fullBleed ? '100vw' : '(max-width: 768px) 100vw, 50vw'}
              onLoad={() => tandaiDimuat(indeks)}
              className={cn(
                'object-cover select-none transition-opacity duration-700 ease-in-out motion-reduce:duration-200',
                tampil ? 'opacity-100' : 'opacity-0',
              )}
            />
          );
        })}
      </div>

      {banyak && (
        <div className={cn('absolute right-3 flex items-center gap-0.5 rounded-lg bg-ink/55 px-1.5 py-0.5 backdrop-blur-sm', fullBleed ? 'top-24' : 'top-3')}>
          {/* Reduced motion: tidak ada autoplay, jadi kontrol jeda/putar tidak diperlukan. */}
          {!reduksi && (
            <button
              type="button"
              onClick={() => setDijedaPengguna((v) => !v)}
              aria-label={dijedaPengguna ? t('putar') : t('jeda')}
              aria-pressed={dijedaPengguna}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {dijedaPengguna ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
                </svg>
              )}
            </button>
          )}
          <div className="flex items-center">
            {daftar.map((src, indeks) => (
              <button
                key={src}
                type="button"
                onClick={() => setAktif(indeks)}
                aria-label={t('keSlide', { n: indeks + 1, total: jumlah })}
                aria-current={indeks === aktif ? 'true' : undefined}
                className="group inline-flex h-6 w-6 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'block h-2 rounded-full bg-white transition-[width,opacity] duration-300',
                    indeks === aktif ? 'w-5 opacity-100' : 'w-2 opacity-60 group-hover:opacity-90',
                  )}
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
