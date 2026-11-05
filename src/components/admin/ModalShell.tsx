'use client';

import type { ReactNode } from 'react';

/** Styled error banner with icon — use instead of bare <div> red boxes */
export function ErrorAlert({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="mt-4 flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="flex-none mt-0.5"
        aria-hidden
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
      <span>{children}</span>
    </div>
  );
}

/**
 * Reusable admin modal shell.
 * - Backdrop blur overlay, click-outside to close
 * - Gradient header (brand-50 → white) with animated close button
 * - Bottom-sheet on mobile, centered dialog on sm+
 * - Scrollable body
 */
export default function ModalShell({
  title,
  subtitle,
  onClose,
  maxWidth = 'max-w-2xl',
  children,
}: {
  title: ReactNode;
  subtitle?: string;
  onClose: () => void;
  maxWidth?: string;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/50 backdrop-blur-[2px] px-0 sm:px-4 py-0 sm:py-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`relative w-full ${maxWidth} bg-white rounded-t-3xl sm:rounded-2xl border border-brand-100/70 shadow-[0_24px_60px_-12px_rgba(14,26,20,0.26)] max-h-[92dvh] sm:max-h-[calc(100vh-3rem)] flex flex-col`}
      >
        {/* Drag handle — mobile only */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-brand-200" />
        </div>

        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between gap-3 px-6 py-4 md:px-8 bg-gradient-to-r from-brand-50/80 to-white rounded-t-3xl sm:rounded-t-2xl border-b border-brand-100">
          <div className="min-w-0">
            <h2 className="font-display text-xl font-bold text-ink leading-snug">{title}</h2>
            {subtitle && (
              <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="flex-shrink-0 rounded-full p-2 text-ink-muted hover:bg-brand-100/80 hover:text-brand-700 hover:rotate-90 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 cursor-pointer"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M2 2l12 12M14 2L2 14" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 min-h-0">
          {children}
        </div>
      </div>
    </div>
  );
}

/** Standardized modal footer button row */
export function ModalFooter({ children }: { children: ReactNode }) {
  return <div className="mt-6 flex gap-3 justify-end">{children}</div>;
}

/** Cancel button */
export function BtnCancel({ onClick, children = 'Batal' }: { onClick: () => void; children?: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-ink-muted hover:bg-gray-50 hover:border-gray-300 active:scale-95 transition-all duration-150 cursor-pointer"
    >
      {children}
    </button>
  );
}

/** Primary save button */
export function BtnSave({
  onClick,
  loading = false,
  disabled = false,
  children = 'Simpan',
  type = 'button',
}: {
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  children?: ReactNode;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading || disabled}
      className="rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm shadow-brand/25 transition-all duration-150 cursor-pointer"
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          Menyimpan...
        </span>
      ) : children}
    </button>
  );
}
