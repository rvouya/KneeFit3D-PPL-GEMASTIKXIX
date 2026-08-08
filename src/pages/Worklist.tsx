import { Link, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { Logo } from '../components/Logo';
import { Button } from '../components/ui/Button';
import { StatusBadge, type CaseStatus } from '../components/ui/StatusBadge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { api, formatUploaded, type ApiCase, type CaseList } from '../lib/api';
import { STATUS_BUTTONS } from '../lib/caseActions';

const FILTERS: { key: string; label: string }[] = [
  { key: 'all', label: 'Semua' },
  { key: 'queued', label: 'Queued' },
  { key: 'processing', label: 'Processing' },
  { key: 'ready', label: 'Ready for review' },
  { key: 'reviewed', label: 'Reviewed' },
];

function RowActions({ c, onDone }: { c: ApiCase; onDone: () => void }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const btns = STATUS_BUTTONS[c.status as CaseStatus] ?? [];

  return (
    // klik tombol tidak boleh ikut memicu klik baris di belakangnya
    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
      {btns.map((b) => {
        if (b.to) {
          return (
            <Button
              key={b.label}
              size="sm"
              variant={b.kind === 'primary' ? 'primary' : 'secondary'}
              onClick={() => navigate(b.to!(c.id))}
            >
              {b.label}
            </Button>
          );
        }
        // server action (cancel / reset)
        return (
          <button
            key={b.label}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await api.action(c.id, b.action!);
                onDone();
              } catch (e) {
                alert((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
            className={clsx(
              'text-sm disabled:opacity-50',
              b.kind === 'ghost'
                ? 'text-ink-400 hover:text-ink-600'
                : 'rounded-lg border border-ink-200 px-3 py-1.5 font-semibold text-ink-800 hover:bg-ink-50',
            )}
          >
            {busy ? '…' : b.label}
          </button>
        );
      })}
    </div>
  );
}

/** Tujuan klik baris: kasus yang sudah ditinjau langsung ke laporan. */
const rowTarget = (c: ApiCase) =>
  c.status === 'reviewed'
    ? `/cases/${encodeURIComponent(c.id)}/report`
    : `/cases/${encodeURIComponent(c.id)}/reconstruction`;

/** Worklist / dashboard kasus — node 2:455. */
export function Worklist() {
  const navigate = useNavigate();
  const [active, setActive] = useState('all');
  const [q, setQ] = useState('');
  const [data, setData] = useState<CaseList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.listCases({ status: active, q });
      setData(res);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [active, q]);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(load, 200); // light debounce for search
    return () => clearTimeout(t);
  }, [load]);

  const counts = data?.counts;
  const rows = data?.cases ?? [];

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="flex items-center justify-between border-b border-ink-200 bg-white px-6 py-3">
        <div className="flex items-center gap-3">
          <Logo />
          <div className="mx-1 h-5 w-px bg-ink-300" />
          <span className="text-sm font-semibold text-ink-800">Dashboard</span>
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

      <main className="mx-auto max-w-[1360px] p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-[26px] font-bold text-ink-800">Worklist kasus</h1>
            <p className="mt-1 text-sm text-ink-500">
              {counts ? `${counts.total} kasus` : '…'} · diperbarui otomatis secara real-time
            </p>
          </div>
          <Button onClick={() => navigate('/cases/new/upload')}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M8 3.5v9M3.5 8h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            Kasus baru
          </Button>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] max-w-[340px] flex-1">
            <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="m11 11 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari ID kasus, sisi lutut..."
              className="h-10 w-full rounded-lg border border-ink-200 bg-white pl-9 pr-3 text-sm text-ink-800 placeholder:text-ink-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {FILTERS.map((f) => {
              const on = f.key === active;
              const n = f.key === 'all' ? counts?.total : counts?.byStatus?.[f.key as CaseStatus];
              return (
                <button
                  key={f.key}
                  onClick={() => setActive(f.key)}
                  aria-pressed={on}
                  className={clsx(
                    'h-9 rounded-full px-3.5 text-[13px] font-medium transition-colors',
                    on ? 'bg-ink-900 text-white' : 'border border-ink-200 bg-white text-ink-600 hover:bg-ink-100',
                  )}
                >
                  {f.label}{n != null ? ` · ${n}` : ''}
                </button>
              );
            })}
          </div>

          <button className="ml-auto flex h-9 items-center gap-2 rounded-lg border border-ink-200 bg-white px-3 text-[13px] font-medium text-ink-700 hover:bg-ink-100">
            30 hari terakhir
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="overflow-hidden rounded-card border border-ink-200 bg-white shadow-card">
          {error ? (
            <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
              <p className="text-sm font-semibold text-status-error">Gagal memuat data</p>
              <p className="max-w-md text-xs text-ink-500">{error}</p>
              <p className="max-w-md text-xs text-ink-400">
                Data tersimpan di browser ini (IndexedDB). Coba muat ulang halaman.
              </p>
              <Button size="sm" variant="secondary" onClick={load} className="mt-2">
                Coba lagi
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-ink-200 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                      <th className="px-5 py-3.5 font-semibold">ID Kasus</th>
                      <th className="px-3 py-3.5 font-semibold">Pasien<br />(de-id)</th>
                      <th className="px-3 py-3.5 font-semibold">Sisi</th>
                      <th className="px-3 py-3.5 font-semibold">Diunggah</th>
                      <th className="px-3 py-3.5 font-semibold">Status</th>
                      <th className="px-3 py-3.5 font-semibold">Progres</th>
                      <th className="px-5 py-3.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {loading && rows.length === 0 ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}>
                          <td colSpan={7} className="px-5 py-4">
                            <div className="h-5 w-full animate-pulse rounded bg-ink-100" />
                          </td>
                        </tr>
                      ))
                    ) : rows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-16 text-center text-sm text-ink-500">
                          Tidak ada kasus yang cocok.
                        </td>
                      </tr>
                    ) : (
                      rows.map((c) => (
                        <tr
                          key={c.id}
                          onClick={() => navigate(rowTarget(c))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              navigate(rowTarget(c));
                            }
                          }}
                          tabIndex={0}
                          role="link"
                          aria-label={`Buka kasus ${c.id}`}
                          className="cursor-pointer hover:bg-ink-50/60 focus:bg-ink-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                        >
                          <td className="px-5 py-4">
                            <Link
                              to={rowTarget(c)}
                              onClick={(e) => e.stopPropagation()}
                              className="text-sm font-semibold text-ink-900 hover:text-accent"
                            >
                              {c.id}
                            </Link>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-ink-700">{c.sex} · {c.age} th</td>
                          <td className="px-3 py-4 text-sm text-ink-700">{c.side}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-ink-600">{formatUploaded(c.uploaded_at)}</td>
                          <td className="px-3 py-4"><StatusBadge status={c.status} /></td>
                          <td className="px-3 py-4">
                            {c.status === 'processing' ? (
                              <div className="flex items-center gap-3">
                                <ProgressBar value={c.progress_pct} />
                                <span className="whitespace-nowrap text-[13px] text-ink-600">
                                  {c.progress_stage} · {c.progress_pct}%
                                </span>
                              </div>
                            ) : c.note ? (
                              <span className={clsx('text-[13px]', c.status === 'error' ? 'text-status-error' : 'text-ink-600')}>
                                {c.note}
                              </span>
                            ) : null}
                          </td>
                          <td className="px-5 py-4"><RowActions c={c} onDone={load} /></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t border-ink-200 px-5 py-3.5">
                <span className="text-[13px] text-ink-500">
                  Menampilkan {rows.length} dari {counts?.total ?? rows.length} kasus
                </span>
                <nav className="flex items-center gap-1" aria-label="Paginasi">
                  <button className="grid h-8 w-8 place-items-center rounded-md border border-ink-200 text-ink-500 hover:bg-ink-100" aria-label="Sebelumnya">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden><path d="m10 4-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                  <button className="grid h-8 w-8 place-items-center rounded-md bg-ink-900 text-sm font-medium text-white">1</button>
                  <button className="grid h-8 w-8 place-items-center rounded-md border border-ink-200 text-ink-500 hover:bg-ink-100" aria-label="Berikutnya">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden><path d="m6 4 4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                </nav>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
