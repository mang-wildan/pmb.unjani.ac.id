import type { ReactNode } from 'react';

export default function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 md:mb-8 flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-ink">{title}</h1>
        {description && <p className="text-ink-muted mt-1">{description}</p>}
      </div>
      {action}
    </header>
  );
}
