'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useTransition } from 'react';
import { cn } from '@/lib/cn';

export default function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function switchLocale(next: 'id' | 'en') {
    if (next === locale) return;
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <div className="flex items-center gap-0.5 rounded-full border border-brand-100 bg-white p-0.5">
      {(['id', 'en'] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => switchLocale(l)}
          disabled={isPending}
          className={cn(
            'px-2.5 py-1 rounded-full text-xs font-bold uppercase transition',
            locale === l
              ? 'bg-brand text-white shadow-soft'
              : 'text-ink-muted hover:bg-brand-50 hover:text-brand-700',
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
