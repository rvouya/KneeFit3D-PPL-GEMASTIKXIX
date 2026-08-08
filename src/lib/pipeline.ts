/**
 * Port browser dari `server/src/ml.ts` → `stub()`.
 *
 * Pipeline ML asli belum ada; backend pun memakai angka deterministik yang
 * sama ini setiap kali FastAPI service tidak menyala. Mode standalone memakai
 * stub langsung, tanpa jaringan.
 */

export type ImplantCandidate = {
  size: string;
  /** Kode katalog implan GCK4 untuk ukuran ini, mis. "M1". */
  implant_code: string;
  score: number;
  note: string;
  recommended: boolean;
};

export type FitMetric = {
  size: string; ssim: number; psnr: number;
  dice: number; rmse: number; fit_score: number;
};

export type PipelineResult = {
  preprocess: { normalized_ref: string; spacing_mm: number; quality_ok: boolean; notes: string[] };
  reconstruct: {
    segmentation_file: string;
    femur_stl: string;
    tibia_stl: string;
    confidence: number;
    landmarks: Record<string, unknown>;
  };
  sizing: { candidates: ImplantCandidate[]; recommended_size: string };
  fitting: FitMetric[];
  source: 'stub';
};

const digits = (code: string) => (code.match(/[0-9]+$/)?.[0] ?? '0000').slice(-4);

/** 8 hex char, padanan `randomBytes(4).toString('hex')` di Node. */
function rid(): string {
  const b = new Uint8Array(4);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

export function runPipeline(caseCode: string): PipelineResult {
  const d = digits(caseCode);
  const candidates: ImplantCandidate[] = [
    { size: 'M',  implant_code: 'M1',  score: 92, note: 'Direkomendasikan',       recommended: true },
    { size: 'L',  implant_code: 'L1',  score: 81, note: 'Overhang medial 2.1 mm', recommended: false },
    { size: 'S',  implant_code: 'S1',  score: 76, note: 'Undercoverage ML 2.8%',  recommended: false },
    { size: 'XL', implant_code: 'XL1', score: 63, note: 'Overhang medial 3.4 mm', recommended: false },
  ];
  return {
    preprocess: { normalized_ref: `norm-${caseCode}`, spacing_mm: 0.143, quality_ok: true, notes: [] },
    reconstruct: {
      segmentation_file: `segmentation-${d}-${rid()}.nii.gz`,
      femur_stl: `humanfemur-${d}-${rid()}.stl`,
      tibia_stl: `humantibiafibula-${d}-${rid()}.stl`,
      confidence: 0.94,
      landmarks: {},
    },
    sizing: { candidates, recommended_size: 'M' },
    // PSNR = 20·log10(50 mm / RMSE), jadi konsisten dengan RMSE tiap ukuran
    fitting: [
      { size: 'M',  ssim: 0.88, psnr: 35.7, dice: 0.94, rmse: 0.82, fit_score: 92 },
      { size: 'L',  ssim: 0.85, psnr: 33.6, dice: 0.92, rmse: 1.05, fit_score: 81 },
      { size: 'S',  ssim: 0.83, psnr: 32.1, dice: 0.9,  rmse: 1.24, fit_score: 76 },
      { size: 'XL', ssim: 0.79, psnr: 29.3, dice: 0.86, rmse: 1.71, fit_score: 63 },
    ],
    source: 'stub',
  };
}
