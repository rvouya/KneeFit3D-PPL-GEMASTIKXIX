import type { CaseStatus } from '../components/ui/StatusBadge';

export type CaseFile = { kind: 'nifti' | 'stl'; filename: string; meta: string };

export type ApiCase = {
  id: string;
  sex: 'P' | 'L';
  age: number;
  nik: string | null;
  full_name: string | null;
  side: 'Kanan' | 'Kiri';
  status: CaseStatus;
  progress_stage: string | null;
  progress_pct: number;
  note: string | null;
  uploaded_at: string;
  files?: CaseFile[];
};

export type CaseList = {
  cases: ApiCase[];
  counts: { total: number; byStatus: Partial<Record<CaseStatus, number>> };
};

export type User = { id: number; email: string; name: string; org: string };

export type CaseAction = 'cancel' | 'review' | 'reset' | 'process' | 'finish';

export type NewCase = {
  nik: string;
  full_name: string;
  age: number;
  sex: 'P' | 'L';
  side: 'Kanan' | 'Kiri';
};

async function unwrap(r: Response) {
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body?.error || `HTTP ${r.status}`);
  return body;
}

export const api = {
  login: (email: string, password: string): Promise<User> =>
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }).then(unwrap),

  listCases: (opts: { status?: string; q?: string } = {}): Promise<CaseList> => {
    const p = new URLSearchParams();
    if (opts.status && opts.status !== 'all') p.set('status', opts.status);
    if (opts.q) p.set('q', opts.q);
    return fetch(`/api/cases?${p.toString()}`).then(unwrap);
  },

  getCase: (code: string): Promise<ApiCase> =>
    fetch(`/api/cases/${encodeURIComponent(code)}`).then(unwrap),

  createCase: (payload: NewCase): Promise<ApiCase> =>
    fetch('/api/cases', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(unwrap),

  action: (code: string, action: CaseAction): Promise<ApiCase> =>
    fetch(`/api/cases/${encodeURIComponent(code)}/${action}`, { method: 'POST' }).then(unwrap),
};

/** Relative Indonesian timestamp: "Hari ini 09:41" / "Kemarin 15:44" / date. */
export function formatUploaded(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const hhmm = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, now)) return `Hari ini ${hhmm}`;
  if (sameDay(d, yesterday)) return `Kemarin ${hhmm}`;
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) + ` ${hhmm}`;
}
