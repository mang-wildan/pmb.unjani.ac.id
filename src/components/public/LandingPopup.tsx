'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type PopupItem = {
  _id: string;
  judul: string;
  alt?: string;
  url?: string;
  hideForDays: number;
  durasiTampil: number;
};

function storageKey(id: string) {
  return `pmb_popup_hidden_${id}`;
}

function shouldShow(p: PopupItem): boolean {
  try {
    const raw = localStorage.getItem(storageKey(p._id));
    if (!raw) return true;
    const until = Number(raw);
    if (!Number.isFinite(until)) return true;
    return Date.now() > until;
  } catch {
    return true;
  }
}

export default function LandingPopup({ items }: { items: PopupItem[] }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<PopupItem | null>(null);

  useEffect(() => {
    if (!items?.length) return;
    const next = items.find(shouldShow);
    if (!next) return;
    const t = setTimeout(() => {
      setCurrent(next);
      setOpen(true);
    }, 700);
    return () => clearTimeout(t);
  }, [items]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
    };
    window.addEventListener('keydown', onKey);
    const durasiMs = (current?.durasiTampil ?? 5) * 1000;
    const autoClose = durasiMs > 0 ? setTimeout(() => close(false), durasiMs) : null;
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
      if (autoClose) clearTimeout(autoClose);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function close(persist: boolean) {
    if (persist && current) {
      try {
        const ms = Math.max(1, current.hideForDays ?? 1) * 24 * 60 * 60 * 1000;
        localStorage.setItem(storageKey(current._id), String(Date.now() + ms));
      } catch {}
    }
    setOpen(false);
    setTimeout(() => setCurrent(null), 320);
  }

  if (!current) return null;

  const imageSrc = `/api/popup-image/${current._id}`;
  const hasLink = !!current.url;

  return (
    <div
      aria-hidden={!open}
      className={`fixed inset-0 z-[60] flex items-center justify-center px-4 transition-opacity duration-500 motion-reduce:duration-200 ${
        open ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <button
        aria-label="Tutup"
        className="absolute inset-0 bg-ink/60 backdrop-blur-[2px]"
        onClick={() => close(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={current.judul}
        // FR-37: hanya opacity/transform; reduced motion tanpa geser/skala (fade saja).
        className={`relative w-full max-w-lg rounded-3xl bg-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)] ring-1 ring-black/5 overflow-hidden transition-[opacity,transform] duration-500 ease-gerak motion-reduce:duration-200 ${
          open
            ? 'translate-y-0 scale-100 opacity-100'
            : 'translate-y-6 scale-95 opacity-0 motion-reduce:translate-y-0 motion-reduce:scale-100'
        }`}
      >
        <button
          onClick={() => close(false)}
          aria-label="Tutup popup"
          className="absolute top-3 right-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-ink hover:bg-white shadow-soft"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        {hasLink ? (
          <Link
            href={current.url!}
            target={current.url!.startsWith('http') ? '_blank' : undefined}
            rel="noopener noreferrer"
            className="block"
            onClick={() => close(true)}
          >
            <img
              src={imageSrc}
              alt={current.alt || current.judul}
              className="w-full h-auto object-cover"
              loading="eager"
            />
          </Link>
        ) : (
          <img
            src={imageSrc}
            alt={current.alt || current.judul}
            className="w-full h-auto object-cover"
            loading="eager"
          />
        )}
        <div className="px-5 py-3 flex items-center justify-between gap-3 bg-gradient-to-r from-brand-50/60 to-accent-50/60">
          <p className="text-sm font-semibold text-ink truncate">{current.judul}</p>
          <button
            onClick={() => close(true)}
            className="text-xs font-semibold text-ink-muted hover:text-ink whitespace-nowrap"
          >
            Jangan tampilkan lagi
          </button>
        </div>
      </div>
    </div>
  );
}
