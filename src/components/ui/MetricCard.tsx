import { clsx } from 'clsx';
import type { ReactNode } from 'react';

export function MetricCard({
  label,
  value,
  unit,
  tone = 'neutral',
  dark = false,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'accent';
  dark?: boolean;
}) {
  const valueTone = {
    neutral: dark ? 'text-white' : 'text-ink-900',
    good: 'text-good',
    warn: 'text-warn',
    bad: 'text-bad',
    accent: 'text-accent',
  }[tone];

  return (
    <div
      className={clsx(
        'rounded-lg border p-3',
        dark ? 'border-white/10 bg-white/5' : 'border-ink-200 bg-ink-50',
      )}
    >
      <div
        className={clsx(
          'text-[11px] font-medium',
          dark ? 'text-ink-400' : 'text-ink-500',
        )}
      >
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className={clsx('text-xl font-bold tabular-nums', valueTone)}>
          {value}
        </span>
        {unit && (
          <span className={clsx('text-xs', dark ? 'text-ink-400' : 'text-ink-500')}>
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}
