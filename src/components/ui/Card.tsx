import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-3xl border border-brand-100 bg-white shadow-soft p-6 md:p-7 transition hover:border-brand-300',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = 'brand',
  className,
}: {
  children: ReactNode;
  tone?: 'brand' | 'accent' | 'muted';
  className?: string;
}) {
  const tones: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-700',
    accent: 'bg-accent-50 text-accent-700',
    muted: 'bg-gray-100 text-gray-700',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  id,
  level = 2,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
  id?: string;
  /** Tingkat judul: 1 untuk judul utama halaman (satu per halaman), 2 untuk section. */
  level?: 1 | 2;
}) {
  const Judul = level === 1 ? 'h1' : 'h2';
  return (
    <header id={id} className={cn('max-w-2xl', align === 'center' && 'mx-auto text-center')}>
      {eyebrow && (
        <>
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-700">{eyebrow}</p>
          {/* Garis eyebrow (FR-36): tergambar saat section masuk layar (globals.css .garis-eyebrow). */}
          <span
            aria-hidden="true"
            className={cn('garis-eyebrow mt-2 block h-0.5 w-12 rounded-full bg-brand', align === 'center' && 'mx-auto')}
          />
        </>
      )}
      <Judul className="mt-2 font-display text-3xl md:text-4xl font-bold text-ink leading-tight">
        {title}
      </Judul>
      {description && <p className="mt-3 text-ink-muted text-base md:text-lg">{description}</p>}
    </header>
  );
}
