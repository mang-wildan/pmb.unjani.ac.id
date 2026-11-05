'use client';

import { useEffect, useRef, useState } from 'react';

// Titik "ping" untuk indikator yang bermakna (mis. gelombang aktif). Animasinya dijeda saat
// elemen di luar layar (FR-37) lewat atribut data-terlihat + animation-play-state (globals.css).
// Tanpa JS / tanpa IntersectionObserver animasi tetap berjalan seperti sebelumnya.
export default function IndikatorPing({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [terlihat, setTerlihat] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setTerlihat(entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <span
      ref={ref}
      aria-hidden="true"
      data-terlihat={terlihat ? 'true' : 'false'}
      className={`absolute inline-flex h-full w-full rounded-full motion-safe:animate-ping ${className}`}
    />
  );
}
