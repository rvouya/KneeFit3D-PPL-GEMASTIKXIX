import { clsx } from 'clsx';

const ITEMS = [
  ['drag kiri', 'rotasi'],
  ['scroll', 'zoom'],
  ['drag kanan / 2 jari', 'pan'],
];

/** Keterangan kontrol viewer 3D (pengganti tool dock). */
export function ControlsLegend({ dark = false }: { dark?: boolean }) {
  return (
    <div
      className={clsx(
        'flex flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded-lg px-4 py-2 text-xs shadow-float backdrop-blur',
        dark ? 'bg-ink-900/80 text-ink-300 ring-1 ring-white/10' : 'bg-white/90 text-ink-600 ring-1 ring-ink-200',
      )}
    >
      {ITEMS.map(([k, v]) => (
        <span key={k} className="flex items-center gap-1.5">
          <span className={clsx('rounded px-1.5 py-0.5 font-mono text-[11px]', dark ? 'bg-white/10 text-white' : 'bg-ink-100 text-ink-700')}>
            {k}
          </span>
          <span className="font-medium">{v}</span>
        </span>
      ))}
    </div>
  );
}
