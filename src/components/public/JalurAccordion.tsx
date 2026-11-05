'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/cn';
import Reveal from './Reveal';

export type JalurAccordionItem = {
  id: string;
  slug: string;
  index: number;
  nama: string;
  ringkasan?: string;
  deskripsiHtml?: string;
  persyaratan: string[];
  badge?: string;
};

export default function JalurAccordion({
  items,
  tingkatJudul = 'h3',
}: {
  items: JalurAccordionItem[];
  tingkatJudul?: 'h2' | 'h3';
}) {
  const t = useTranslations('jalurPage');
  const Judul = tingkatJudul;
  const JudulPersyaratan = tingkatJudul === 'h2' ? 'h3' : 'h4';
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = (id: string) => setOpenId((prev) => (prev === id ? null : id));

  return (
    <div className="rounded-3xl border border-brand-100 bg-white shadow-soft overflow-hidden">
      {items.map((item) => {
        const isOpen = openId === item.id;
        const triggerId = `jalur-trigger-${item.id}`;
        const panelId = `jalur-panel-${item.id}`;

        return (
          // Baris masuk bertahap (FR-36); garis pemisah dipindah ke pembungkus agar last: tetap berlaku.
          <Reveal key={item.id} urutan={item.index} className="border-b border-brand-100 last:border-b-0">
            <article
              id={item.slug}
              className={cn(
                'border-l-4 transition-colors duration-300',
                isOpen ? 'border-l-brand' : 'border-l-transparent',
              )}
            >
              <Judul className="m-0">
              <button
                id={triggerId}
                type="button"
                onClick={() => toggle(item.id)}
                aria-expanded={isOpen}
                aria-controls={panelId}
                className="w-full flex items-center gap-4 px-6 py-5 text-left hover:bg-brand-50/40 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              >
                <span
                  className={cn(
                    'flex h-9 w-9 flex-none items-center justify-center rounded-full text-sm font-bold transition-colors duration-300',
                    isOpen ? 'bg-brand text-white' : 'bg-brand-50 text-brand-700',
                  )}
                  aria-hidden
                >
                  {item.index + 1}
                </span>

                <span className="block flex-1 min-w-0">
                  <span className="flex items-center gap-3 flex-wrap">
                    <span className="font-display font-bold text-lg text-ink leading-snug">
                      {item.nama}
                    </span>
                    {item.badge && (
                      <span className="inline-flex items-center rounded-full bg-accent/20 px-3 py-0.5 text-xs font-semibold uppercase tracking-wide text-accent-700">
                        {item.badge}
                      </span>
                    )}
                  </span>
                  {item.ringkasan && (
                    <span className={cn('mt-0.5 block text-sm font-normal text-ink-muted', !isOpen && 'line-clamp-1')}>
                      {item.ringkasan}
                    </span>
                  )}
                </span>

                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  aria-hidden
                  className={cn(
                    'flex-none text-brand-700 transition-transform duration-300 motion-reduce:transition-none',
                    isOpen && 'rotate-180',
                  )}
                >
                  <path
                    d="M5 7.5l5 5 5-5"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              </Judul>

              <div
                id={panelId}
                role="region"
                aria-labelledby={triggerId}
                inert={!isOpen}
                // FR-37: buka/tutup lewat grid-template-rows 0fr->1fr, bukan max-height.
                className={cn(
                  'grid transition-[grid-template-rows,opacity] duration-300 ease-gerak motion-reduce:transition-opacity motion-reduce:duration-200',
                  isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                )}
              >
                <div className="min-h-0 overflow-hidden">
                  <div className="px-6 pb-6 pt-1 space-y-4">
                    {item.deskripsiHtml && (
                      <div
                        className="prose-brand text-ink-muted text-sm"
                        dangerouslySetInnerHTML={{ __html: item.deskripsiHtml }}
                      />
                    )}

                    {item.persyaratan.length > 0 && (
                      <div className="pt-3 border-t border-brand-50">
                        <JudulPersyaratan className="text-xs font-semibold uppercase tracking-widest text-brand-700 mb-3">
                          {t('persyaratan', { nama: item.nama })}
                        </JudulPersyaratan>
                        <ul className="space-y-2">
                          {item.persyaratan.map((p, i) => (
                            <li key={i} className="flex gap-3 text-sm text-ink-muted">
                              <span
                                className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700"
                                aria-hidden
                              >
                                {i + 1}
                              </span>
                              <span>{p}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </article>
          </Reveal>
        );
      })}
    </div>
  );
}
