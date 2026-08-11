import { Link, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import { Logo } from '../components/Logo';
import { Button } from '../components/ui/Button';
import { StatusBadge, type CaseStatus } from '../components/ui/StatusBadge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { EditCaseDialog } from '../components/EditCaseDialog';
import { UserMenu } from '../components/UserMenu';
import { api, formatUploaded, type ApiCase, type CaseList } from '../lib/api';
import { STATUS_BUTTONS } from '../lib/caseActions';

const FILTERS: { key: string; label: string }[] = [
  { key: 'all', label: 'Semua' },
  { key: 'queued', label: 'Queued' },
  { key: 'processing', label: 'Processing' },
  { key: 'ready', label: 'Ready for review' },
  { key: 'reviewed', label: 'Reviewed' },
];

/** Konfirmasi hapus. Kasus di IndexedDB tidak punya recycle bin — sekali hapus, hilang. */
function DeleteCaseDialog({
  c,
  onClose,
  onDeleted,
}: {
  c: ApiCase;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function remove() {
    setError(null);
    setBusy(true);
    try {
      await api.deleteCase(c.id);
      onDeleted();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink-900/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Hapus kasus ${c.id}`}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[420px] rounded-card border border-ink-200 bg-white p-6 shadow-card"
      >
        <h2 className="text-lg font-bold text-ink-800">Hapus pasien ini?</h2>
        <p className="mt-2 text-sm text-ink-600">
          Kasus <span className="font-mono font-semibold text-ink-800">{c.id}</span>
          {c.full_name ? ` · ${c.full_name}` : ''} akan dihapus beserta citra X-ray, snapshot 3D, dan
          hasil fitting-nya.
        </p>
        <p className="mt-2 text-xs text-ink-500">
          Data tersimpan di browser ini saja dan tidak bisa dikembalikan. Buat cadangan lebih dulu
          bila masih diperlukan.
        </p>

        {error && (
          <p className="mt-3 rounded-md border border-status-errorBg bg-status-errorBg/40 px-3 py-2 text-xs text-status-error">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Batal
          </Button>
          <Button variant="danger" onClick={remove} disabled={busy}>
            {busy ? 'Menghapus…' : 'Hapus permanen'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function RowActions({
  c,
  onDone,
  onEdit,
  onDelete,
}: {
  c: ApiCase;
  onDone: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
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

      {/* Edit & hapus dilipat ke menu supaya baris tidak penuh tombol. */}
      <RowMenu c={c} onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
}

/** Menu "⋯" per baris: aksi yang jarang dipakai tidak perlu memakan lebar tabel. */
function RowMenu({ c, onEdit, onDelete }: { c: ApiCase; onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const boxRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!boxRef.current?.contains(t) && !btnRef.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    // Posisi menu dibekukan saat dibuka, jadi scroll apa pun membuatnya basi.
    const onScroll = () => setOpen(false);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open]);

  function toggle() {
    // Menu dipasang ke <body>: kartu worklist meng-clip overflow, jadi dropdown
    // yang dirender di dalam baris akan terpotong.
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    setOpen((v) => !v);
  }

  const item =
    'flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium transition-colors';

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Aksi lain untuk kasus ${c.id}`}
        className={clsx(
          'grid h-8 w-8 place-items-center rounded-lg text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          open && 'bg-ink-100 text-ink-800',
        )}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
          <circle cx="8" cy="3" r="1.4" />
          <circle cx="8" cy="8" r="1.4" />
          <circle cx="8" cy="13" r="1.4" />
        </svg>
      </button>

      {open && createPortal(
        <div
          ref={boxRef}
          role="menu"
          style={{ top: pos.top, right: pos.right }}
          className="fixed z-50 w-48 overflow-hidden rounded-card border border-ink-200 bg-white py-1 shadow-card"
        >
          <button
            role="menuitem"
            onClick={() => { setOpen(false); onEdit(); }}
            className={clsx(item, 'text-ink-700 hover:bg-ink-50 hover:text-ink-900')}
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M11.2 2.8a1.7 1.7 0 0 1 2.4 2.4L5.9 12.9l-3.1.8.8-3.1 7.6-7.8Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
            </svg>
            Edit data pasien
          </button>
          <button
            role="menuitem"
            onClick={() => { setOpen(false); onDelete(); }}
            className={clsx(item, 'text-status-error hover:bg-status-errorBg/40')}
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M2.8 4.2h10.4M6.4 4.2V2.9h3.2v1.3M4.2 4.2l.6 8.3a1 1 0 0 0 1 .9h4.4a1 1 0 0 0 1-.9l.6-8.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Hapus pasien
          </button>
        </div>,
        document.body,
      )}
    </>
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
  // Dialog dipegang di level halaman supaya overlay-nya tidak terpotong <td>.
  const [editing, setEditing] = useState<ApiCase | null>(null);
  const [deleting, setDeleting] = useState<ApiCase | null>(null);

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
        <UserMenu />
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
                          <td className="px-5 py-4">
                            <RowActions
                              c={c}
                              onDone={load}
                              onEdit={() => setEditing(c)}
                              onDelete={() => setDeleting(c)}
                            />
                          </td>
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

      {editing && (
        <EditCaseDialog
          c={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}

      {deleting && (
        <DeleteCaseDialog
          c={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() => {
            setDeleting(null);
            load();
          }}
        />
      )}
    </div>
  );
}
