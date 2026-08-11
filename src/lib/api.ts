/**
 * Fasad data aplikasi. Mode standalone: tidak ada backend — setiap metode
 * dilayani `./db` (IndexedDB di browser). Bentuk tipe dan pesan galat sengaja
 * dipertahankan sama seperti versi HTTP supaya halaman tidak perlu diubah
 * kalau nanti backend dinyalakan lagi.
 */
import type { CaseStatus } from '../components/ui/StatusBadge';
import * as db from './db';

/** Alias supaya `./db` tidak perlu ikut mengimpor komponen UI. */
export type CaseStatusLike = CaseStatus;

export type CaseFile = { kind: 'nifti' | 'stl'; filename: string; meta: string; url: string | null };

/** Citra X-ray input; `data_url` kosong bila berkas DICOM (tidak bisa dirender browser). */
export type CaseImage = {
  projection: 'AP' | 'LAT';
  filename: string;
  mime: string | null;
  data_url: string | null;
};

export type ApiCase = {
  id: string;
  sex: 'P' | 'L';
  age: number;
  nik: string | null;
  full_name: string | null;
  birth_date: string | null;
  side: 'Kanan' | 'Kiri';
  status: CaseStatus;
  progress_stage: string | null;
  progress_pct: number;
  note: string | null;
  uploaded_at: string;
  files?: CaseFile[];
  images?: CaseImage[];
  /** Snapshot kanvas 3D (data URL) yang disimpan saat konfirmasi ukuran. */
  snapshot?: string | null;
};

export type CaseList = {
  cases: ApiCase[];
  counts: { total: number; byStatus: Partial<Record<CaseStatus, number>> };
};

export type User = { id: number; email: string; name: string; org: string };

export type CaseAction = 'cancel' | 'review' | 'unreview' | 'reset' | 'process' | 'finish';

export type NewCase = {
  nik: string;
  full_name: string;
  /** ISO YYYY-MM-DD; usia dihitung server dari nilai ini. */
  birth_date: string;
  sex: 'P' | 'L';
  side: 'Kanan' | 'Kiri';
  /** Citra X-ray AP + Lateral yang diunggah; disimpan untuk laporan. */
  images?: { projection: 'AP' | 'LAT'; filename: string; mime: string | null; data_url: string | null }[];
};

/**
 * Data kasus yang bisa disunting dari worklist: identitas + citra X-ray.
 * `images` opsional — kalau tidak dikirim, citra lama dipertahankan apa adanya.
 */
export type CasePatch = NewCase;

export type FittingCandidate = {
  size: string; score: number; note: string; recommended: boolean;
  /** Kode katalog implan GCK4 untuk ukuran ini, mis. "M1". */
  implant_code?: string;
};
export type FittingMetric = {
  size: string; ssim: string | number; psnr: string | number;
  dice: string | number; rmse: string | number; fit_score: number;
};
export type Fitting = { candidates: FittingCandidate[]; metrics: FittingMetric[] };

export const api = {
  login: (email: string, password: string): Promise<User> => db.login(email, password),

  listCases: (opts: { status?: string; q?: string } = {}): Promise<CaseList> =>
    db.listCases(opts) as Promise<CaseList>,

  getCase: (code: string): Promise<ApiCase> => db.getCase(code),

  getFitting: (code: string): Promise<Fitting> => db.getFitting(code),

  createCase: (payload: NewCase): Promise<ApiCase> => db.createCase(payload),

  updateCase: (code: string, patch: CasePatch): Promise<ApiCase> => db.updateCase(code, patch),

  deleteCase: (code: string): Promise<{ ok: true }> => db.deleteCase(code),

  saveSnapshot: (code: string, snapshot: string): Promise<{ ok: true }> =>
    db.saveSnapshot(code, snapshot),

  action: (code: string, action: CaseAction): Promise<ApiCase> => db.applyAction(code, action),

  /** Cadangan lokal — data hanya ada di browser ini, tidak ada server. */
  exportBackup: (): Promise<string> => db.exportBackup(),
  importBackup: (json: string): Promise<number> => db.importBackup(json),
  resetAll: (): Promise<void> => db.resetAll(),
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
