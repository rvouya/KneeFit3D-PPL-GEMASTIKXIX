import { randomBytes } from 'node:crypto';

const BASE = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export type ImageInput = { projection: 'AP' | 'LAT'; path?: string; base64?: string; mime?: string };

export type ReconstructResult = {
  segmentation_file: string;
  femur_stl: string;
  tibia_stl: string;
  confidence: number;
  landmarks: Record<string, unknown>;
};
export type ImplantCandidate = { size: string; score: number; note: string; recommended: boolean };
export type FitMetric = {
  size: string; rmse: number; coverage_tibia: number;
  max_overhang: number; notching_risk: string; fit_score: number;
};
export type PipelineResult = {
  preprocess: { normalized_ref: string; spacing_mm: number; quality_ok: boolean; notes: string[] };
  reconstruct: ReconstructResult;
  sizing: { candidates: ImplantCandidate[]; recommended_size: string };
  fitting: FitMetric[];
  source: 'ml-service' | 'stub';
};

const digits = (code: string) => (code.match(/[0-9]+$/)?.[0] ?? '0000').slice(-4);
const rid = () => randomBytes(4).toString('hex');

/** Deterministic fallback identical to ml/pipeline stubs (used when service is down). */
function stub(caseCode: string): PipelineResult {
  const d = digits(caseCode);
  const candidates: ImplantCandidate[] = [
    { size: 'Ukuran B', score: 92, note: 'Direkomendasikan', recommended: true },
    { size: 'Ukuran A', score: 78, note: 'Undercoverage ML 2.8%', recommended: false },
    { size: 'Ukuran C', score: 64, note: 'Overhang medial 3.4 mm', recommended: false },
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
    sizing: { candidates, recommended_size: 'Ukuran B' },
    fitting: [
      { size: 'Ukuran B', rmse: 0.82, coverage_tibia: 96.9, max_overhang: 1.6, notching_risk: 'Rendah', fit_score: 92 },
      { size: 'Ukuran A', rmse: 1.14, coverage_tibia: 94.1, max_overhang: 2.2, notching_risk: 'Sedang', fit_score: 78 },
      { size: 'Ukuran C', rmse: 1.68, coverage_tibia: 98.3, max_overhang: 3.4, notching_risk: 'Tinggi', fit_score: 64 },
    ],
    source: 'stub',
  };
}

/** Run full pipeline via the Python ML service; fall back to stub on any failure. */
export async function runPipeline(caseCode: string, side: string, images: ImageInput[] = []): Promise<PipelineResult> {
  try {
    const r = await fetch(`${BASE}/pipeline`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ case_code: caseCode, side, images }),
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) throw new Error(`ML ${r.status}`);
    const data = (await r.json()) as Omit<PipelineResult, 'source'>;
    return { ...data, source: 'ml-service' };
  } catch {
    return stub(caseCode);
  }
}
