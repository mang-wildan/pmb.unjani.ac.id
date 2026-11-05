import { cn } from '@/lib/cn';
import { LABEL_STATUS, type StatusPeriode } from '@/lib/statusPeriode';

// Chip status periode (FR-61). Selalu berteks, bukan hanya warna. `label` menimpa teks bawaan,
// mis. "Tayang" dan "Terjadwal" untuk popup.

const GAYA: Record<StatusPeriode, string> = {
  berjalan: 'bg-brand-50 text-brand-700',
  'akan-datang': 'bg-sky-50 text-sky-700',
  nonaktif: 'bg-gray-100 text-gray-600',
  arsip: 'bg-amber-50 text-amber-700',
};

export const LABEL_POPUP: Record<StatusPeriode, string> = {
  berjalan: 'Tayang',
  'akan-datang': 'Terjadwal',
  nonaktif: 'Nonaktif',
  arsip: 'Arsip',
};

export default function LabelStatus({
  status,
  label,
  className,
}: {
  status: StatusPeriode;
  label?: string;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide', GAYA[status], className)}>
      {label ?? LABEL_STATUS[status]}
    </span>
  );
}
