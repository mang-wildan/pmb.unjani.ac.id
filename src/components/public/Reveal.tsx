'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type Ref } from 'react';
import { cn } from '@/lib/cn';
import { prefersReducedMotion } from '@/lib/useReducedMotion';

// Animasi masuk section landing (FR-32, FR-36).
// - HTML server selalu terlihat: tanpa JS konten tampil penuh (SEO-06, Keputusan Teknis #14).
// - Setelah hidrasi, elemen yang sudah berada di layar (atau di atasnya) ditandai tampil seketika
//   tanpa animasi. Hanya elemen di bawah layar yang disembunyikan, lalu masuk saat terlihat.
// - Hanya opacity/transform. Stagger lewat prop `urutan` (50ms per butir, total jeda <=400ms).
// - Reduced motion: fade 200ms tanpa geser (tier 2).
// - Atribut data-reveal / data-revealed dipakai CSS turunan (mis. garis eyebrow SectionHeading).

type Status = 'awal' | 'tampil' | 'tunggu' | 'masuk';

type Props = {
  children: ReactNode;
  className?: string;
  /** Jeda tambahan (ms). Digabung dengan `urutan`; total jeda dibatasi 400ms. */
  delayMs?: number;
  /** Indeks butir dalam grid untuk stagger (0, 1, 2, ...). */
  urutan?: number;
  as?: 'div' | 'section' | 'article' | 'li';
  /** 'naik' (bawaan): fade + geser 20px; 'fade': hanya opacity (mis. CTA penutup, FR-36). */
  efek?: 'naik' | 'fade';
};

const JEDA_PER_BUTIR = 50;
const JEDA_MAKS = 400;
const DURASI = 500;
const DURASI_REDUKSI = 200;

export default function Reveal({ children, className, delayMs = 0, urutan = 0, as = 'div', efek = 'naik' }: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const [status, setStatus] = useState<Status>('awal');
  const [reduksi, setReduksi] = useState(false);
  const hanyaFade = reduksi || efek === 'fade';

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Jaring pengaman: tanpa IntersectionObserver, tampilkan apa adanya.
    if (typeof IntersectionObserver === 'undefined') {
      setStatus('tampil');
      return;
    }

    // Sudah di layar atau di atasnya (mis. kembali ke posisi gulir): jangan disembunyikan.
    const kotak = el.getBoundingClientRect();
    if (kotak.top < window.innerHeight) {
      setStatus('tampil');
      return;
    }

    setReduksi(prefersReducedMotion());
    setStatus('tunggu');
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setStatus('masuk');
          io.disconnect();
        }
      },
      // Dipicu sedikit sebelum elemen masuk layar agar gulir cepat tidak menyisakan area kosong.
      { threshold: 0, rootMargin: '0px 0px 10% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const jeda = Math.min(Math.max(0, delayMs) + Math.max(0, urutan) * JEDA_PER_BUTIR, JEDA_MAKS);
  const gaya: CSSProperties | undefined =
    status === 'masuk'
      ? {
          transitionDuration: `${reduksi ? DURASI_REDUKSI : DURASI}ms`,
          transitionDelay: `${reduksi ? 0 : jeda}ms`,
        }
      : undefined;

  const Tag = as as 'div';
  return (
    <Tag
      ref={ref as Ref<HTMLDivElement>}
      data-reveal={status}
      data-revealed={status === 'tampil' || status === 'masuk' ? '' : undefined}
      style={gaya}
      className={cn(
        status === 'tunggu' && (hanyaFade ? 'opacity-0' : 'opacity-0 translate-y-5'),
        status === 'masuk' &&
          (hanyaFade
            ? 'opacity-100 transition-opacity ease-out'
            : 'opacity-100 translate-y-0 transition-[opacity,transform] ease-gerak'),
        className,
      )}
    >
      {children}
    </Tag>
  );
}
