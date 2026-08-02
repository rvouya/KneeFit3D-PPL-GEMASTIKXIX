import { clsx } from 'clsx';
import { useState } from 'react';

const TOOLS = ['Rotasi', 'Pan', 'Zoom', 'Potongan'] as const;
type Tool = (typeof TOOLS)[number];

export function ToolDock({ dark = false }: { dark?: boolean }) {
  const [active, setActive] = useState<Tool>('Rotasi');
  return (
    <div
      className={clsx(
        'inline-flex items-center gap-1 rounded-xl p-1 shadow-float backdrop-blur',
        dark ? 'bg-ink-900/80 ring-1 ring-white/10' : 'bg-white/90 ring-1 ring-ink-200',
      )}
      role="toolbar"
      aria-label="Alat viewer"
    >
      {TOOLS.map((t) => {
        const on = t === active;
        return (
          <button
            key={t}
            onClick={() => setActive(t)}
            aria-pressed={on}
            className={clsx(
              'rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-colors',
              on
                ? 'bg-accent-active text-white'
                : dark
                ? 'text-ink-300 hover:bg-white/5'
                : 'text-ink-600 hover:bg-ink-100',
            )}
          >
            {t}
          </button>
        );
      })}
    </div>
  );
}
