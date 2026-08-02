import { Link } from 'react-router-dom';
import { Logo } from './Logo';

export type Crumb = { label: string; to?: string; muted?: boolean };

/** Top navigation — node 2:305 (shared across inner pages). */
export function AppHeader({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <header className="flex items-center justify-between border-b border-ink-200 bg-white px-6 py-3">
      <div className="flex items-center">
        <Link to="/worklist" aria-label="KneeFit3D beranda">
          <Logo />
        </Link>
        <div className="mx-4 h-5 w-px bg-ink-300" />
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span className="text-ink-500">/</span>}
              {c.to ? (
                <Link to={c.to} className="text-ink-500 hover:text-ink-700">
                  {c.label}
                </Link>
              ) : (
                <span
                  className={
                    c.muted ? 'text-ink-400' : 'font-semibold text-ink-800'
                  }
                >
                  {c.label}
                </span>
              )}
            </span>
          ))}
        </nav>
      </div>

      <div className="flex items-center">
        <div className="flex flex-col items-end">
          <span className="text-sm font-semibold text-ink-800">dr. Adi Wibowo</span>
          <span className="text-xs text-ink-500">RSUD Harapan Sehat</span>
        </div>
        <div className="ml-3 grid h-8 w-8 place-items-center rounded-full bg-ink-800 text-sm font-semibold text-white">
          AW
        </div>
      </div>
    </header>
  );
}
