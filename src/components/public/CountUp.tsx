'use client';

import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '@/lib/useReducedMotion';

// Angka statistik hero yang dihitung naik sekali saat terlihat (FR-34).
// - Angka final dirender server, sehingga tanpa JS (dan untuk mesin pencari) nilainya benar.
// - Lebar dikunci (tabular-nums + min-width sebanyak digit) agar tidak ada pergeseran tata letak.
// - Teks berubah lewat ref (tanpa render ulang React); pembaca layar membaca salinan statis.
// - Reduced motion atau tanpa IntersectionObserver: tidak berjalan, angka final tetap.

const DURASI_MS = 800;

export default function CountUp({ nilai, className }: { nilai: number; className?: string }) {
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || nilai <= 0 || prefersReducedMotion() || typeof IntersectionObserver === 'undefined') return;

    let frame = 0;
    const jalankan = () => {
      const mulai = performance.now();
      const langkah = (kini: number) => {
        const p = Math.min(1, (kini - mulai) / DURASI_MS);
        const ease = 1 - Math.pow(1 - p, 3);
        el.textContent = String(Math.round(nilai * ease));
        if (p < 1) frame = requestAnimationFrame(langkah);
      };
      el.textContent = '0';
      frame = requestAnimationFrame(langkah);
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          jalankan();
        }
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
      el.textContent = String(nilai);
    };
  }, [nilai]);

  return (
    <>
      <span
        ref={ref}
        aria-hidden="true"
        className={`inline-block tabular-nums ${className ?? ''}`}
        style={{ minWidth: `${String(nilai).length}ch` }}
      >
        {nilai}
      </span>
      <span className="sr-only">{nilai}</span>
    </>
  );
}
