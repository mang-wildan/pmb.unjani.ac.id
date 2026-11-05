'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import TrackedRegistrationLink from './TrackedRegistrationLink';

export default function DaftarFloatingButton({ url }: { url: string }) {
  const t = useTranslations('hero');
  const [visible, setVisible] = useState(false);
  // Kilau hanya sekali, saat tombol pertama kali tampil (FR-35).
  const [kilau, setKilau] = useState(false);
  const sudahTampil = useRef(false);

  useEffect(() => {
    const hero = document.getElementById('hero');
    if (!hero) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const tampil = !entry.isIntersecting;
        setVisible(tampil);
        if (tampil && !sudahTampil.current) {
          sudahTampil.current = true;
          setKilau(true);
        }
      },
      { threshold: 0 },
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  return (
    <TrackedRegistrationLink
      href={url}
      location="floating"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Daftar sekarang"
      // Transisi masuk/keluar di globals.css (.tombol-melayang, @starting-style): hanya opacity,
      // transform, dan warna; tidak lagi transition-all.
      data-tampil={visible ? 'true' : 'false'}
      className="tombol-melayang fixed bottom-5 z-50 md:hidden flex h-14 items-center gap-2 overflow-hidden isolate rounded-full bg-brand px-5 shadow-[0_18px_45px_rgba(14,104,78,0.28)] ring-1 ring-black/5 hover:scale-105 hover:bg-brand-600 motion-safe:active:scale-[0.97] right-[5.5rem]"
    >
      {kilau && (
        <span
          aria-hidden="true"
          onAnimationEnd={() => setKilau(false)}
          className="pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-0 motion-safe:animate-kilau [animation-delay:300ms]"
        />
      )}
      <span className="relative text-sm font-bold text-white">{t('daftarSekarang')}</span>
    </TrackedRegistrationLink>
  );
}
