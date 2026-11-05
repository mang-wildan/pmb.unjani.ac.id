import Link from 'next/link';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { cn } from '@/lib/cn';

// Komponen presentasi dashboard admin (dipindah dari page.tsx tanpa perubahan perilaku).

dayjs.locale('id');

export function Icon({
  name,
  className = 'h-5 w-5',
}: {
  name: 'calendar' | 'book' | 'file' | 'megaphone' | 'activity' | 'arrow' | 'warning' | 'check' | 'chart';
  className?: string;
}) {
  const common = {
    className,
    fill: 'none',
    viewBox: '0 0 24 24',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  if (name === 'calendar') {
    return (
      <svg {...common}>
        <path d="M8 2v4M16 2v4M3 10h18" />
        <rect x="3" y="4" width="18" height="18" rx="3" />
      </svg>
    );
  }
  if (name === 'book') {
    return (
      <svg {...common}>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z" />
      </svg>
    );
  }
  if (name === 'file') {
    return (
      <svg {...common}>
        <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" />
        <path d="M14 2v5h5M9 13h6M9 17h4" />
      </svg>
    );
  }
  if (name === 'megaphone') {
    return (
      <svg {...common}>
        <path d="m3 11 18-5v12L3 14v-3zM11 16l2 5H9l-2-6" />
      </svg>
    );
  }
  if (name === 'activity') {
    return (
      <svg {...common}>
        <path d="M22 12h-4l-3 8-6-16-3 8H2" />
      </svg>
    );
  }
  if (name === 'arrow') {
    return (
      <svg {...common}>
        <path d="M5 12h14M13 5l7 7-7 7" />
      </svg>
    );
  }
  if (name === 'warning') {
    return (
      <svg {...common}>
        <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
        <path d="M12 9v4M12 17h.01" />
      </svg>
    );
  }
  if (name === 'check') {
    return (
      <svg {...common}>
        <path d="M20 6 9 17l-5-5" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M3 3v18h18" />
      <path d="m7 15 4-4 3 3 5-7" />
    </svg>
  );
}

export function formatDate(value?: Date | string) {
  if (!value) return 'Belum diatur';
  return dayjs(value).format('DD MMM YYYY');
}

export function StatusPill({ children, tone = 'success' }: { children: string; tone?: 'success' | 'info' | 'warning' | 'muted' }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide',
        tone === 'success' && 'bg-brand-50 text-brand-700',
        tone === 'info' && 'bg-sky-50 text-sky-700',
        tone === 'warning' && 'bg-amber-50 text-amber-700',
        tone === 'muted' && 'bg-gray-100 text-gray-600',
      )}
    >
      {children}
    </span>
  );
}

export function KpiCard({
  label,
  value,
  detail,
  icon,
  tone = 'brand',
}: {
  label: string;
  value: number;
  detail: string;
  icon: 'calendar' | 'book' | 'file' | 'megaphone' | 'chart';
  tone?: 'brand' | 'sky' | 'amber' | 'slate';
}) {
  return (
    <div className="rounded-2xl border border-brand-100 bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">{label}</p>
          <p className="mt-2 font-display text-3xl font-extrabold text-ink">{value}</p>
        </div>
        <span
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-xl',
            tone === 'brand' && 'bg-brand-50 text-brand-700',
            tone === 'sky' && 'bg-sky-50 text-sky-700',
            tone === 'amber' && 'bg-amber-50 text-amber-700',
            tone === 'slate' && 'bg-slate-100 text-slate-700',
          )}
        >
          <Icon name={icon} />
        </span>
      </div>
      <p className="mt-3 text-sm text-ink-muted">{detail}</p>
    </div>
  );
}

export function ProgressRow({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-ink">{label}</span>
        <span className="text-ink-muted">{value}/{total}</span>
      </div>
      <div className="h-2 rounded-full bg-brand-50">
        <div className="h-2 rounded-full bg-brand" style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}

export function QuickAction({ href, label, description }: { href: string; label: string; description: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-4 rounded-xl border border-brand-100 bg-white px-4 py-3 transition-colors duration-200 hover:border-brand-300 hover:bg-brand-50/50"
    >
      <span>
        <span className="block text-sm font-bold text-ink">{label}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">{description}</span>
      </span>
      <Icon name="arrow" className="h-4 w-4 flex-none text-brand-700 transition-transform duration-200 group-hover:translate-x-0.5" />
    </Link>
  );
}
