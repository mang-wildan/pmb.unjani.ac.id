import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Field({
  label,
  children,
  hint,
  error,
  className,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  error?: string;
  className?: string;
}) {
  return (
    <label className={cn('block', className)}>
      <span className="block text-xs font-bold uppercase tracking-wide text-ink-muted mb-1.5">
        {label}
      </span>
      {children}
      {hint && !error && (
        <span className="mt-1.5 flex items-start gap-1 text-xs text-ink-soft leading-relaxed">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-none mt-px" aria-hidden>
            <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
          </svg>
          {hint}
        </span>
      )}
      {error && (
        <span role="alert" className="mt-1.5 flex items-start gap-1 text-xs text-red-600 font-medium leading-relaxed">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-none mt-px" aria-hidden>
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
          </svg>
          {error}
        </span>
      )}
    </label>
  );
}

export const inputClass =
  'w-full rounded-xl border border-brand-100 bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 hover:border-brand-200 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-colors duration-150 cursor-text';

export const textareaClass = `${inputClass} min-h-[120px] resize-y cursor-auto`;

export const selectClass =
  'w-full rounded-xl border border-brand-100 bg-white px-3.5 py-2.5 text-sm text-ink hover:border-brand-200 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-colors duration-150 cursor-pointer';
