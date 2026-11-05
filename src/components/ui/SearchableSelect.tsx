'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';
import { inputClass } from '@/components/admin/Field';

export type SearchableSelectOption = {
  value: string;
  label: string;
  sublabel?: string;
  dotColor?: string;
};

type Props = {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  searchable?: boolean;
  rounded?: 'xl' | 'full' | '2xl';
};

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = '— Pilih —',
  disabled = false,
  id,
  searchable = true,
  rounded = 'xl',
}: Props) {
  const selected = options.find((o) => o.value === value) ?? null;
  const [query, setQuery] = useState(selected?.label ?? '');
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    setQuery(selected?.label ?? '');
  }, [value, selected?.label]);

  useEffect(() => {
    if (!open || !wrapperRef.current) return;
    function updatePosition() {
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    }
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open]);

  const filtered = !searchable || query.trim() === '' || query === selected?.label
    ? options
    : options.filter((o) =>
        `${o.label} ${o.sublabel ?? ''}`.toLowerCase().includes(query.toLowerCase()),
      );

  function openDropdown() {
    if (disabled) return;
    if (searchable) setQuery('');
    setOpen(true);
    setActiveIdx(-1);
  }

  function closeDropdown() {
    setOpen(false);
    setQuery(selected?.label ?? '');
    setActiveIdx(-1);
  }

  function selectOption(opt: SearchableSelectOption) {
    onChange(opt.value);
    setQuery(opt.label);
    setOpen(false);
    setActiveIdx(-1);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement | HTMLDivElement>) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openDropdown();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (activeIdx >= 0 && filtered[activeIdx]) selectOption(filtered[activeIdx]);
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      closeDropdown();
    }
  }

  useEffect(() => {
    if (activeIdx < 0 || !listRef.current) return;
    const item = listRef.current.children[activeIdx] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node) &&
        listRef.current &&
        !listRef.current.contains(e.target as Node)
      ) {
        closeDropdown();
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [selected?.label]);

  const baseInputClass = inputClass.replace('rounded-xl', `rounded-${rounded}`);

  const chevron = (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted transition-transform duration-200',
        open && 'rotate-180',
      )}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M2 4l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );

  const dropdown = open && mounted ? createPortal(
    <ul
      ref={listRef}
      role="listbox"
      style={dropdownStyle}
      className="max-h-60 overflow-y-auto rounded-2xl border border-brand-100 bg-white shadow-soft py-1"
    >
      {filtered.length === 0 ? (
        <li className="px-4 py-2.5 text-sm text-ink-muted">Tidak ada hasil.</li>
      ) : (
        filtered.map((opt, idx) => {
          const isSelected = opt.value === value;
          const isActive = idx === activeIdx;
          return (
            <li
              key={opt.value}
              role="option"
              aria-selected={isSelected}
              className={cn(
                'cursor-pointer px-4 py-2.5 text-sm flex items-center gap-2.5',
                isActive ? 'bg-brand-50 text-brand-700' : 'text-ink hover:bg-brand-50/60',
                isSelected && !isActive && 'font-semibold',
              )}
              onMouseDown={(e) => { e.preventDefault(); selectOption(opt); }}
              onMouseEnter={() => setActiveIdx(idx)}
            >
              {opt.dotColor && (
                <span className={`w-2 h-2 rounded-full flex-none ${opt.dotColor}`} />
              )}
              <span className="flex-1 leading-snug">
                {opt.label}
                {opt.sublabel && (
                  <span className="block text-xs text-ink-muted leading-tight">{opt.sublabel}</span>
                )}
              </span>
              {isSelected && (
                <svg className="w-4 h-4 flex-none text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </li>
          );
        })
      )}
    </ul>,
    document.body,
  ) : null;

  return (
    <div ref={wrapperRef} className="relative">
      {searchable ? (
        <div className="relative">
          <input
            ref={inputRef}
            id={id}
            type="text"
            autoComplete="off"
            disabled={disabled}
            className={cn(baseInputClass, 'pr-8', disabled && 'opacity-60 cursor-not-allowed')}
            placeholder="Ketik untuk mencari..."
            value={open ? query : (selected?.label ?? '')}
            onChange={(e) => { setQuery(e.target.value); setActiveIdx(-1); }}
            onFocus={openDropdown}
            onKeyDown={handleKeyDown}
          />
          {chevron}
        </div>
      ) : (
        <div className="relative">
          <div
            ref={triggerRef}
            id={id}
            role="combobox"
            aria-expanded={open}
            aria-haspopup="listbox"
            tabIndex={disabled ? -1 : 0}
            onClick={() => (open ? closeDropdown() : openDropdown())}
            onKeyDown={handleKeyDown}
            className={cn(
              baseInputClass,
              'pr-8 flex items-center gap-2 select-none',
              disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
            )}
          >
            {selected?.dotColor && (
              <span className={`w-2 h-2 rounded-full flex-none ${selected.dotColor}`} />
            )}
            <span className={cn('flex-1 truncate', !selected && 'text-ink-soft/60')}>
              {selected?.label ?? placeholder}
            </span>
          </div>
          {chevron}
        </div>
      )}
      {dropdown}
    </div>
  );
}
