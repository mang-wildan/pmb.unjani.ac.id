import { cn } from '@/lib/cn';

type RippleLoaderProps = {
  label?: string;
  className?: string;
};

export default function RippleLoader({
  label = 'Memuat...',
  className,
}: RippleLoaderProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 text-center', className)}>
      <div className="ld-ripple" aria-hidden="true">
        <div />
        <div />
      </div>
      <p className="text-sm text-ink-muted">{label}</p>
    </div>
  );
}
