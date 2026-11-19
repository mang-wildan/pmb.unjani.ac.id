'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import TrackedAnalyticsLink from './TrackedAnalyticsLink';
import { ANALYTICS_EVENTS } from '@/lib/analytics';

export type JalurAccordionItem = {
  id: string; slug: string; index: number; nama: string; ringkasan?: string;
  deskripsiHtml?: string; persyaratan: string[]; badge?: string;
};

export default function JalurAccordion({ items, tingkatJudul = 'h3', urlPendaftaran }: {
  items: JalurAccordionItem[]; tingkatJudul?: 'h2' | 'h3'; urlPendaftaran?: string;
}) {
  const t = useTranslations('jalurPage');
  const [selectedId, setSelectedId] = useState(items[0]?.id);
  const asideRef = useRef<HTMLElement | null>(null);
  const selected = items.find((item) => item.id === selectedId) || items[0];
  const pilihJalur = (id: string) => {
    setSelectedId(id);
    // Di mobile panel persyaratan ada di atas daftar; bawa panel ke layar agar hasil pilihan terlihat.
    if (typeof window === 'undefined' || !window.matchMedia('(max-width: 1023px)').matches) return;
    const reduksi = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    requestAnimationFrame(() => {
      asideRef.current?.focus({ preventScroll: true });
      asideRef.current?.scrollIntoView({ behavior: reduksi ? 'instant' : 'smooth', block: 'start' });
    });
  };
  const Judul = tingkatJudul;
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)]">
      {selected && <aside ref={asideRef} tabIndex={-1} id="jalur-persyaratan" aria-live="polite" className="focus-visible:outline-brand scroll-mt-24 rounded-lg border border-[#CBD9CD] bg-white p-6 lg:sticky lg:top-24">
        <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">{t('persyaratan', { nama: selected.nama })}</p>
        <h3 className="mt-3 font-display text-2xl font-bold">{selected.nama}</h3>
        {selected.deskripsiHtml && <div className="prose-brand mt-4 text-sm text-ink-muted" dangerouslySetInnerHTML={{ __html: selected.deskripsiHtml }} />}
        <ul className="mt-5 space-y-3">{selected.persyaratan.map((p, i) => <li key={i} className="flex gap-3 text-sm text-ink-muted"><span aria-hidden className="font-bold text-brand">✓</span><span>{p}</span></li>)}</ul>
        {urlPendaftaran && <TrackedAnalyticsLink href={urlPendaftaran} eventName={ANALYTICS_EVENTS.ctaDaftarClick} eventParams={{ location: 'jalur-seleksi' }} target="_blank" rel="noopener noreferrer" className="mt-6 flex min-h-12 items-center justify-center rounded-lg bg-brand px-5 py-3 font-semibold text-white focus-visible:ring-4 focus-visible:ring-accent">{t('daftarJalur')}</TrackedAnalyticsLink>}
      </aside>}
      <div className="space-y-3">{items.map((item) => <article key={item.id} id={item.slug} className="scroll-mt-24">
        <Judul><button type="button" aria-pressed={selected?.id === item.id} aria-controls="jalur-persyaratan" onClick={() => pilihJalur(item.id)} className={`flex w-full items-start gap-4 rounded-lg border p-5 text-left focus-visible:ring-4 focus-visible:ring-accent ${selected?.id === item.id ? 'border-brand bg-[#D9EADC]' : 'border-[#CBD9CD] bg-white hover:bg-[#E3ECE3]'}`}>
          <span className="font-display text-2xl font-bold text-brand" aria-hidden>{String(item.index + 1).padStart(2, '0')}</span>
          <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className="font-display text-lg font-bold">{item.nama}</span>{item.badge && <span className="rounded-lg bg-accent px-2 py-1 text-xs text-[#1D2114]">{item.badge}</span>}</span>{item.ringkasan && <span className="mt-2 block text-sm font-normal text-ink-muted">{item.ringkasan}</span>}</span>
          <span aria-hidden>→</span>
        </button></Judul>
      </article>)}</div>
    </div>
  );
}
