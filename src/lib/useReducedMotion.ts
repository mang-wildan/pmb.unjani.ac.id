'use client';

import { useSyncExternalStore } from 'react';

// Preferensi "kurangi gerak" pengguna (FR-33). Saat SSR dan hidrasi pertama nilainya false
// (snapshot server), lalu React menyinkronkan ke nilai browser tanpa mismatch hidrasi.
// Listener `change` membuat perubahan preferensi berlaku tanpa memuat ulang halaman.

const QUERY = '(prefers-reduced-motion: reduce)';

function langganan(callback: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mql = window.matchMedia(QUERY);
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
}

function snapshotKlien() {
  return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(QUERY).matches;
}

function snapshotServer() {
  return false;
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(langganan, snapshotKlien, snapshotServer);
}

/** Versi non-hook untuk dipakai di dalam effect atau handler. */
export function prefersReducedMotion(): boolean {
  return snapshotKlien();
}
