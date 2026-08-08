/**
 * Penyimpanan lokal mode standalone — pengganti PostgreSQL + Express.
 *
 * Semua yang dulu dikerjakan `server/src/routes/*.ts` dijalankan di browser
 * dengan IndexedDB. Satu object store `cases`, key `case_code`; baris-baris
 * yang dulu terpisah (case_files, case_images, implant_candidates,
 * fit_metrics, reconstructions, case_events) sekarang jadi field di dalam
 * satu record karena tidak ada query lintas tabel yang dibutuhkan UI.
 *
 * IndexedDB dipakai, bukan localStorage: satu citra X-ray base64 saja bisa
 * beberapa MB, sedangkan kuota localStorage ~5 MB untuk seluruh origin.
 */

import type {
  ApiCase, CaseFile, CaseImage, CaseStatusLike,
  FittingCandidate, FittingMetric, NewCase, User,
} from './api';
import { DEMO_USER, meshFor } from '../data/registry';
import { runPipeline } from './pipeline';

const DB_NAME = 'kneefit3d';
const DB_VERSION = 1;
const STORE = 'cases';
const META = 'meta';
/** Naikkan kalau bentuk data seed berubah, supaya browser lama ikut ter-seed ulang. */
const SEED_VERSION = 1;

export type CaseRecord = ApiCase & {
  files: CaseFile[];
  images: CaseImage[];
  snapshot: string | null;
  candidates: FittingCandidate[];
  metrics: FittingMetric[];
  events: { from: string | null; to: string; actor: string; at: string }[];
};

// ===== primitif IndexedDB =====

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB tidak bisa dibuka.'));
  });
  return dbPromise;
}

function wrap<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Operasi IndexedDB gagal.'));
  });
}

async function allCases(): Promise<CaseRecord[]> {
  const db = await openDB();
  return wrap(db.transaction(STORE, 'readonly').objectStore(STORE).getAll() as IDBRequest<CaseRecord[]>);
}

async function readCase(code: string): Promise<CaseRecord | undefined> {
  const db = await openDB();
  return wrap(db.transaction(STORE, 'readonly').objectStore(STORE).get(code) as IDBRequest<CaseRecord | undefined>);
}

async function writeCases(records: CaseRecord[]): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE, 'readwrite');
  for (const r of records) tx.objectStore(STORE).put(r);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Gagal menulis ke IndexedDB.'));
    tx.onabort = () => reject(tx.error ?? new Error('Transaksi IndexedDB dibatalkan.'));
  });
}

async function metaGet<T>(key: string): Promise<T | undefined> {
  const db = await openDB();
  return wrap(db.transaction(META, 'readonly').objectStore(META).get(key) as IDBRequest<T | undefined>);
}

async function metaSet(key: string, value: unknown): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(META, 'readwrite');
  tx.objectStore(META).put(value, key);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Gagal menulis meta.'));
  });
}

// ===== util yang dulu ada di server =====

/** Umur penuh tahun pada hari ini, dari tanggal lahir ISO (YYYY-MM-DD). */
export function ageFromBirthDate(iso: string): number {
  const b = new Date(`${iso}T00:00:00Z`);
  const now = new Date();
  let years = now.getUTCFullYear() - b.getUTCFullYear();
  const beforeBirthday =
    now.getUTCMonth() < b.getUTCMonth() ||
    (now.getUTCMonth() === b.getUTCMonth() && now.getUTCDate() < b.getUTCDate());
  if (beforeBirthday) years -= 1;
  return years;
}

/** Terima hanya data URL gambar; tolak skema lain supaya tidak jadi vektor injeksi. */
const DATA_URL = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
const asDataUrl = (v: unknown): string | null =>
  typeof v === 'string' && v.length <= 8_000_000 && DATA_URL.test(v) ? v : null;

const TRANSITIONS: Record<string, { from: string[]; to: CaseStatusLike }> = {
  cancel:  { from: ['queued', 'processing'], to: 'canceled' },
  review:  { from: ['ready'], to: 'reviewed' },
  reset:   { from: ['error', 'canceled'], to: 'queued' },
  process: { from: ['queued'], to: 'processing' },
  finish:  { from: ['processing'], to: 'ready' },
};

const NOTE_ON: Record<string, string | null> = {
  canceled: 'Dibatalkan operator',
  reviewed: 'Rekomendasi dikonfirmasi',
  queued: null,
  processing: 'Rekonstruksi 3D',
  ready: 'Rekonstruksi selesai · menunggu tinjauan',
};

/** Bentuk yang dilihat halaman: record tanpa field internal. */
function toApiCase(r: CaseRecord): ApiCase {
  const { candidates: _c, metrics: _m, events: _e, ...rest } = r;
  return rest;
}

function nextCaseCode(records: CaseRecord[]): string {
  // padanan COALESCE(MAX(suffix), 91) + 1 di server
  const max = records.reduce((acc, r) => {
    const n = Number(r.id.match(/[0-9]+$/)?.[0] ?? 0);
    return Number.isFinite(n) && n > acc ? n : acc;
  }, 91);
  return `KF-2419-${String(max + 1).padStart(4, '0')}`;
}

// ===== seed =====

/** Satu kasus contoh, padanan `server/src/scripts/setup.ts`. */
function seedCase(): CaseRecord {
  const code = 'KF-2419-0092';
  const p = runPipeline(code);
  const rec = p.reconstruct;
  const mesh = meshFor('3273010101580001', 'Siti Rahmawati', '1958-01-01', 'P');
  return {
    id: code,
    sex: 'P',
    age: ageFromBirthDate('1958-01-01'),
    nik: '3273010101580001',
    full_name: 'Siti Rahmawati',
    birth_date: '1958-01-01',
    side: 'Kanan',
    status: 'ready',
    progress_stage: null,
    progress_pct: 0,
    note: 'Rekonstruksi selesai · menunggu tinjauan',
    uploaded_at: new Date(Date.now() - 20 * 60_000).toISOString(),
    files: [
      { kind: 'nifti', filename: rec.segmentation_file, meta: 'voxel label · 0.5 mm iso · 4.2 MB', url: null },
      { kind: 'stl', filename: rec.femur_stl, meta: 'femur distal · 34k triangle · 1.6 MB', url: mesh.femur_url },
      { kind: 'stl', filename: rec.tibia_stl, meta: 'tibia + fibula · 48k triangle · 2.3 MB', url: mesh.tibia_url },
    ],
    images: [],
    snapshot: null,
    candidates: p.sizing.candidates,
    metrics: p.fitting,
    events: [{ from: null, to: 'ready', actor: 'seed', at: new Date().toISOString() }],
  };
}

/** Isi kasus contoh sekali saja, saat database browser masih kosong. */
export async function ensureSeeded(): Promise<void> {
  const done = await metaGet<number>('seed_version');
  if (done === SEED_VERSION) return;
  const existing = await allCases();
  if (existing.length === 0) await writeCases([seedCase()]);
  await metaSet('seed_version', SEED_VERSION);
}

// ===== operasi setara route Express =====

export async function login(email: string, password: string): Promise<User> {
  if (!email || !password) throw new Error('Email dan kata sandi wajib diisi.');
  const ok =
    String(email).toLowerCase() === DEMO_USER.email.toLowerCase() &&
    String(password) === DEMO_USER.password;
  if (!ok) throw new Error('Kredensial tidak valid.');
  return { id: DEMO_USER.id, email: DEMO_USER.email, name: DEMO_USER.name, org: DEMO_USER.org };
}

export async function listCases(opts: { status?: string; q?: string } = {}) {
  await ensureSeeded();
  const all = await allCases();
  const needle = opts.q?.toLowerCase().trim();
  const filtered = all
    .filter((r) => (!opts.status || opts.status === 'all' ? true : r.status === opts.status))
    .filter((r) =>
      !needle
        ? true
        : r.id.toLowerCase().includes(needle) ||
          r.side.toLowerCase().includes(needle) ||
          (r.full_name ?? '').toLowerCase().includes(needle),
    )
    .sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at));

  const byStatus: Record<string, number> = {};
  for (const r of all) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
  return { cases: filtered.map(toApiCase), counts: { total: all.length, byStatus } };
}

export async function getCase(code: string): Promise<ApiCase> {
  await ensureSeeded();
  const r = await readCase(code);
  if (!r) throw new Error('Kasus tidak ditemukan.');
  return toApiCase(r);
}

export async function getFitting(code: string) {
  await ensureSeeded();
  const r = await readCase(code);
  if (!r) throw new Error('Kasus tidak ditemukan.');
  return {
    candidates: [...r.candidates].sort((a, b) => b.score - a.score),
    metrics: r.metrics,
  };
}

export async function createCase(payload: NewCase): Promise<ApiCase> {
  await ensureSeeded();
  const nik = String(payload?.nik ?? '').trim();
  const fullName = String(payload?.full_name ?? '').trim();
  const birth = String(payload?.birth_date ?? '').trim();
  const age = /^\d{4}-\d{2}-\d{2}$/.test(birth) ? ageFromBirthDate(birth) : NaN;
  const { sex, side } = payload ?? ({} as NewCase);

  if (!/^\d{16}$/.test(nik) || !fullName) {
    throw new Error('NIK harus 16 digit dan nama lengkap wajib diisi.');
  }
  if (!['P', 'L'].includes(sex) || !['Kanan', 'Kiri'].includes(side) || !Number.isFinite(age) || age <= 0 || age >= 130) {
    throw new Error('Data pasien tidak lengkap / tidak valid (tanggal lahir, kelamin, sisi).');
  }

  const all = await allCases();
  const code = nextCaseCode(all);
  const p = runPipeline(code);
  const rec = p.reconstruct;
  // mesh keluaran: milik pasien terdaftar bila identitas cocok, else mesh default
  const mesh = meshFor(nik, fullName, birth, sex);

  const record: CaseRecord = {
    id: code,
    sex,
    age,
    nik,
    full_name: fullName,
    birth_date: birth,
    side,
    status: 'ready',
    progress_stage: null,
    progress_pct: 0,
    note: 'Rekonstruksi selesai · menunggu tinjauan',
    uploaded_at: new Date().toISOString(),
    files: [
      { kind: 'nifti', filename: rec.segmentation_file, meta: 'voxel label · 0.5 mm iso · 4.2 MB', url: null },
      { kind: 'stl', filename: rec.femur_stl, meta: 'femur distal · 34k triangle · 1.6 MB', url: mesh.femur_url },
      { kind: 'stl', filename: rec.tibia_stl, meta: 'tibia + fibula · 48k triangle · 2.3 MB', url: mesh.tibia_url },
    ],
    // citra X-ray yang diunggah operator disimpan apa adanya untuk laporan
    images: (Array.isArray(payload.images) ? payload.images.slice(0, 2) : []).map((img): CaseImage => {
      const projection = img?.projection === 'LAT' ? 'LAT' : 'AP';
      return {
        projection,
        filename: String(img?.filename ?? `${projection.toLowerCase()}.png`).slice(0, 200),
        mime: String(img?.mime ?? '').slice(0, 100) || null,
        data_url: asDataUrl(img?.data_url),
      };
    }),
    snapshot: null,
    candidates: p.sizing.candidates,
    metrics: p.fitting,
    events: [{ from: null, to: 'ready', actor: 'operator', at: new Date().toISOString() }],
  };

  await writeCases([record]);
  return toApiCase(record);
}

export async function saveSnapshot(code: string, snapshot: string): Promise<{ ok: true }> {
  const valid = asDataUrl(snapshot);
  if (!valid) throw new Error('Snapshot tidak valid.');
  const r = await readCase(code);
  if (!r) throw new Error('Kasus tidak ditemukan.');
  await writeCases([{ ...r, snapshot: valid }]);
  return { ok: true };
}

export async function applyAction(code: string, action: string): Promise<ApiCase> {
  const t = TRANSITIONS[action];
  if (!t) throw new Error('Aksi tidak dikenal.');
  const r = await readCase(code);
  if (!r) throw new Error('Kasus tidak ditemukan.');
  if (!t.from.includes(r.status)) {
    throw new Error(`Aksi "${action}" tidak valid dari status "${r.status}".`);
  }
  const next: CaseRecord = {
    ...r,
    status: t.to,
    note: NOTE_ON[t.to] ?? null,
    progress_stage: t.to === 'processing' ? 'Rekonstruksi 3D' : null,
    progress_pct: t.to === 'processing' ? 5 : 0,
    events: [...r.events, { from: r.status, to: t.to, actor: 'operator', at: new Date().toISOString() }],
  };
  await writeCases([next]);
  return toApiCase(next);
}

// ===== cadangan =====

/**
 * Data hanya ada di browser ini. Membersihkan data situs = semua kasus hilang,
 * jadi ekspor dipakai untuk memindahkan / mem-backup ke berkas JSON.
 */
export async function exportBackup(): Promise<string> {
  const cases = await allCases();
  return JSON.stringify({ version: SEED_VERSION, exported_at: new Date().toISOString(), cases }, null, 2);
}

/** Impor hasil `exportBackup`. Kasus dengan kode sama akan ditimpa. */
export async function importBackup(json: string): Promise<number> {
  const parsed = JSON.parse(json) as { cases?: CaseRecord[] };
  const cases = Array.isArray(parsed?.cases) ? parsed.cases : [];
  if (!cases.length) throw new Error('Berkas cadangan tidak berisi kasus.');
  await writeCases(cases);
  await metaSet('seed_version', SEED_VERSION);
  return cases.length;
}

/** Kosongkan seluruh data lokal, lalu isi ulang kasus contoh. */
export async function resetAll(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction([STORE, META], 'readwrite');
  tx.objectStore(STORE).clear();
  tx.objectStore(META).clear();
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Gagal mengosongkan data.'));
  });
  await ensureSeeded();
}
