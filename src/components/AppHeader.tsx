import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import { UserMenu } from './UserMenu';

export type Crumb = { label: string; to?: string; muted?: boolean };

/**
 * Top navigation — node 2:305 (shared across inner pages).
 *
 * Mundur satu tahap lewat breadcrumb: tiap `Crumb` bertautan `to` jadi tombol
 * back, jadi tidak perlu tombol terpisah di sebelah logo.
 */
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
                <Link
                  to={c.to}
                  className="rounded text-ink-500 underline-offset-4 hover:text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
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

      <UserMenu />
    </header>
  );
}
