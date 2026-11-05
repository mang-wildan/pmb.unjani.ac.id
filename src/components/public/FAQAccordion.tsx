'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/cn';

export type FAQItem = {
  _id: string;
  pertanyaan: string;
  jawaban: string;
  kategori: 'Teknis' | 'Biaya' | 'Jadwal';
  urutan: number;
};

type Category = 'Teknis' | 'Biaya' | 'Jadwal';
const categories: Category[] = ['Teknis', 'Biaya', 'Jadwal'];

export default function FAQAccordion({
  items,
  tampilkanTab = true,
}: {
  items: FAQItem[];
  tampilkanTab?: boolean;
}) {
  const t = useTranslations('faq');

  const categoryLabel: Record<Category, string> = {
    Teknis: t('teknis'),
    Biaya: t('biaya'),
    Jadwal: t('jadwal'),
  };

  const [activeCategory, setActiveCategory] = useState<Category>(() => {
    for (const cat of categories) {
      if (items.some((i) => i.kategori === cat)) return cat;
    }
    return 'Teknis';
  });
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const handleCategoryChange = (cat: Category) => {
    setActiveCategory(cat);
    setOpenIndex(null);
  };

  const filtered = tampilkanTab ? items.filter((i) => i.kategori === activeCategory) : items;

  if (!items.length) return null;

  return (
    <div>
      {tampilkanTab && (
      <div className="flex gap-2 flex-wrap mb-8">
        {categories.map((cat) => {
          const hasItems = items.some((i) => i.kategori === cat);
          if (!hasItems) return null;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => handleCategoryChange(cat)}
              className={cn(
                'px-5 py-2 rounded-full text-sm font-semibold transition',
                activeCategory === cat
                  ? 'bg-brand text-white shadow-soft'
                  : 'text-ink-muted hover:bg-brand-50 hover:text-brand-700',
              )}
            >
              {categoryLabel[cat]}
            </button>
          );
        })}
      </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-ink-muted text-sm">{t('empty')}</p>
      ) : (
        <div className="rounded-3xl border border-brand-100 bg-white shadow-soft overflow-hidden">
          {filtered.map((item, i) => {
            const isOpen = openIndex === i;
            const panelId = `faq-panel-${item._id}`;
            return (
              <div key={item._id} className="border-b border-brand-100 last:border-b-0">
                <h3 className="m-0">
                <button
                  type="button"
                  onClick={() => setOpenIndex((prev) => (prev === i ? null : i))}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left hover:bg-brand-50/50 transition"
                >
                  <span className="font-display font-semibold text-ink text-base">{item.pertanyaan}</span>
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
                </h3>
                {/* FR-37: buka/tutup lewat grid-template-rows 0fr->1fr, bukan max-height. */}
                <div
                  id={panelId}
                  inert={!isOpen}
                  className={cn(
                    'grid transition-[grid-template-rows,opacity] duration-300 ease-gerak motion-reduce:transition-opacity motion-reduce:duration-200',
                    isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                  )}
                >
                  <div className="min-h-0 overflow-hidden">
                    <p className="px-6 pb-5 text-ink-muted text-sm leading-relaxed">{item.jawaban}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
