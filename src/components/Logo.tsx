import { clsx } from 'clsx';

export function Logo({
  size = 'md',
  wordmark = true,
  tone = 'light',
}: {
  size?: 'sm' | 'md';
  wordmark?: boolean;
  tone?: 'light' | 'dark';
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={clsx(
          'grid place-items-center rounded-[4px] bg-accent font-bold text-white',
          size === 'sm' ? 'h-6 w-6 text-[11px]' : 'h-7 w-7 text-xs',
        )}
      >
        K3
      </div>
      {wordmark && (
        <span
          className={clsx(
            'font-bold tracking-tight',
            size === 'sm' ? 'text-[15px]' : 'text-base',
            tone === 'dark' ? 'text-white' : 'text-ink-900',
          )}
        >
          KneeFit3D
        </span>
      )}
    </div>
  );
}
