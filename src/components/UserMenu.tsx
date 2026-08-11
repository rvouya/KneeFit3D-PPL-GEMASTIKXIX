import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearSession, getSession, initialsOf } from '../lib/session';

/** Dipakai kalau sesi kosong — mis. halaman dibuka lewat deep link lama. */
const FALLBACK = { name: 'dr. Adi Wibowo', org: 'RSUD Harapan Sehat', email: '' };

/**
 * Identitas operator di pojok kanan header, sekaligus menu keluar.
 * Sebelumnya blok ini ditulis dua kali (AppHeader + header Worklist) dengan
 * nama hardcode; sekarang satu komponen yang membaca sesi.
 */
export function UserMenu() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const user = getSession() ?? FALLBACK;

  // Klik di luar dan Esc menutup menu — perilaku standar dropdown.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function logout() {
    clearSession();
    // replace: tombol "back" browser tidak boleh mengembalikan ke halaman kasus.
    navigate('/login', { replace: true });
  }

  return (
    <div ref={boxRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menu akun"
        className="flex items-center rounded-lg px-2 py-1 transition-colors hover:bg-ink-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <div className="hidden flex-col items-end sm:flex">
          <span className="text-sm font-semibold text-ink-800">{user.name}</span>
          <span className="text-xs text-ink-500">{user.org}</span>
        </div>
        <div className="ml-3 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink-800 text-sm font-semibold text-white">
          {initialsOf(user.name)}
        </div>
        <svg
          className={`ml-1 text-ink-400 transition-transform ${open ? 'rotate-180' : ''}`}
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden
        >
          <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-card border border-ink-200 bg-white shadow-card"
        >
          <div className="border-b border-ink-100 px-4 py-3">
            <div className="text-sm font-semibold text-ink-800">{user.name}</div>
            {user.email && <div className="mt-0.5 truncate text-xs text-ink-500">{user.email}</div>}
            <div className="mt-0.5 text-xs text-ink-500">{user.org}</div>
          </div>
          <button
            role="menuitem"
            onClick={logout}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-status-error transition-colors hover:bg-status-errorBg/40"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M6 14H3.5A1.5 1.5 0 0 1 2 12.5v-9A1.5 1.5 0 0 1 3.5 2H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M10.5 11 14 8l-3.5-3M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Keluar
          </button>
        </div>
      )}
    </div>
  );
}
