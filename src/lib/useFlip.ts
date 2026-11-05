'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { prefersReducedMotion } from '@/lib/useReducedMotion';

// Transisi FLIP untuk daftar yang disaring (FR-48): posisi tiap butir dicatat sebelum perubahan,
// lalu setelah render butir yang berpindah dianimasikan dari posisi lama ke posisi baru lewat
// Web Animations API (hanya transform), dan butir yang baru muncul di-fade.
// Reduced motion: butir yang berpindah langsung di posisi baru, butir baru hanya fade singkat.
//
// Pemakaian: pasang `ref` pada kontainer, beri tiap butir atribut data-flip-key unik, dan panggil
// `catat()` TEPAT SEBELUM mengubah state penyaring.

const useLayoutEffectAman = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const DURASI_GESER_MS = 300;
const DURASI_MUNCUL_MS = 250;
const DURASI_MUNCUL_REDUKSI_MS = 150;

function terlihat(el: HTMLElement): boolean {
  return el.offsetParent !== null;
}

export function useFlip<T extends HTMLElement>(): { ref: RefObject<T | null>; catat: () => void } {
  const ref = useRef<T | null>(null);
  const awal = useRef<Map<string, DOMRect> | null>(null);

  const catat = useCallback(() => {
    const kontainer = ref.current;
    if (!kontainer) return;
    const peta = new Map<string, DOMRect>();
    kontainer.querySelectorAll<HTMLElement>('[data-flip-key]').forEach((el) => {
      if (terlihat(el)) peta.set(el.dataset.flipKey as string, el.getBoundingClientRect());
    });
    awal.current = peta;
  }, []);

  // Dijalankan setelah setiap render, tetapi langsung berhenti bila tidak ada catatan awal.
  useLayoutEffectAman(() => {
    const sebelum = awal.current;
    awal.current = null;
    const kontainer = ref.current;
    if (!sebelum || !kontainer || typeof Element.prototype.animate !== 'function') return;

    const reduksi = prefersReducedMotion();
    kontainer.querySelectorAll<HTMLElement>('[data-flip-key]').forEach((el) => {
      if (!terlihat(el)) return;
      const lama = sebelum.get(el.dataset.flipKey as string);
      if (!lama) {
        el.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: reduksi ? DURASI_MUNCUL_REDUKSI_MS : DURASI_MUNCUL_MS,
          easing: 'ease-out',
        });
        return;
      }
      if (reduksi) return;
      const baru = el.getBoundingClientRect();
      const dx = lama.left - baru.left;
      const dy = lama.top - baru.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], {
        duration: DURASI_GESER_MS,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      });
    });
  });

  return { ref, catat };
}
