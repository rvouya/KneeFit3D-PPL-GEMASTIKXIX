import { useParams, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { AppHeader } from '../components/AppHeader';
import { ControlsLegend } from '../components/viewer/ControlsLegend';
import { KneeScene } from '../components/viewer/KneeScene';
import { MetricCard } from '../components/ui/MetricCard';
import { Disclaimer } from '../components/Disclaimer';
import { api, type ApiCase, type FittingMetric } from '../lib/api';

type Candidate = {
  size: string;
  /** Kode katalog implan GCK4 untuk ukuran ini. */
  implantCode: string;
  note: string;
  noteTone: 'good' | 'muted' | 'bad';
  score: number;
};

/** Ukuran implan GCK4; M (kode M1) adalah rekomendasi default. */
const CANDIDATES: Candidate[] = [
  { size: 'M', implantCode: 'M1', note: 'Direkomendasikan', noteTone: 'good', score: 92 },
  { size: 'L', implantCode: 'L1', note: 'Overhang medial 2.1 mm', noteTone: 'muted', score: 81 },
  { size: 'S', implantCode: 'S1', note: 'Undercoverage ML 2.8%', noteTone: 'muted', score: 76 },
  { size: 'XL', implantCode: 'XL1', note: 'Overhang medial 3.4 mm', noteTone: 'bad', score: 63 },
];

// PSNR = 20·log10(50 mm / RMSE), jadi konsisten dengan RMSE tiap ukuran
const METRICS_FALLBACK: Record<string, FittingMetric> = {
  M: { size: 'M', ssim: 0.88, psnr: 35.7, dice: 0.94, rmse: 0.82, fit_score: 92 },
  L: { size: 'L', ssim: 0.85, psnr: 33.6, dice: 0.92, rmse: 1.05, fit_score: 81 },
  S: { size: 'S', ssim: 0.83, psnr: 32.1, dice: 0.9, rmse: 1.24, fit_score: 76 },
  XL: { size: 'XL', ssim: 0.79, psnr: 29.3, dice: 0.86, rmse: 1.71, fit_score: 63 },
};

/** Virtual Fitting — rekomendasi ukuran implan + fit scoring, node 3:1338. */
export function VirtualFitting() {
  const { id } = useParams();
  const navigate = useNavigate();
  const caseId = id ? decodeURIComponent(id) : 'KF-2419-0092';
  const [selected, setSelected] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [c, setC] = useState<ApiCase | null>(null);
  const [metrics, setMetrics] = useState<Record<string, FittingMetric>>(METRICS_FALLBACK);
  const captureRef = useRef<(() => string | null) | null>(null);
  const active = CANDIDATES[selected];

  useEffect(() => {
    api.getCase(caseId).then(setC).catch(() => {});
    api
      .getFitting(caseId)
      .then((f) => {
        if (f.metrics?.length) setMetrics(Object.fromEntries(f.metrics.map((m) => [m.size, m])));
      })
      .catch(() => {});
  }, [caseId]);

  const stl = (c?.files ?? []).filter((f) => f.kind === 'stl');
  const [femurUrl, tibiaUrl] = stl.map((f) => f.url);
  const fb = METRICS_FALLBACK[active.size];
  const met = metrics[active.size] ?? fb;
  // baris lama hasil migrasi bisa kosong pada kolom baru → pakai nilai fallback
  const num = (v: string | number | null | undefined, d: number) =>
    v === null || v === undefined || Number.isNaN(Number(v)) ? d : Number(v);
  const onCapture = useCallback((fn: () => string | null) => {
    captureRef.current = fn;
  }, []);

  async function confirm() {
    setConfirming(true);
    try {
      // snapshot viewer ikut disimpan supaya laporan memuat gambar rekonstruksi
      const shot = captureRef.current?.() ?? null;
      if (shot) await api.saveSnapshot(caseId, shot).catch(() => {});
      await api.action(caseId, 'review');
      navigate(`/cases/${encodeURIComponent(caseId)}/report`);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-ink-50">
      <AppHeader
        crumbs={[
          { label: 'Output' },
          { label: 'Virtual Fitting' },
          { label: caseId, muted: true },
        ]}
      />

      <div className="flex min-h-0 flex-1 gap-4 bg-[#f9fafb] p-4">
        <section className="relative min-w-0 flex-1 overflow-hidden rounded-card bg-[#17243c] shadow-card">
          <KneeScene
            implant
            femurUrl={femurUrl}
            tibiaUrl={tibiaUrl}
            side={c?.side ?? 'Kanan'}
            size={active.size}
            onCapture={onCapture}
          />

          <div className="absolute inset-x-4 bottom-4 flex justify-center">
            <ControlsLegend dark />
          </div>
        </section>

        <aside className="flex w-[420px] shrink-0 flex-col overflow-hidden rounded-card border border-ink-200 bg-white shadow-card">
          <div className="flex-1 space-y-6 overflow-auto p-6">
            <div className="rounded-card bg-[#1e5cd4] p-6 text-white shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-accent-soft">
                Prediksi Ukuran
              </div>
              <div className="mt-2 flex items-center gap-3 text-[30px] font-bold leading-9">
                <span>Femur {active.implantCode}</span>
                <span className="text-xl text-[#bfdbfe]">•</span>
                <span>Tibia {active.implantCode}</span>
              </div>
              <p className="mt-1 text-sm text-[#eff6ff]">
                GCK4 {active.implantCode} · ukuran {active.size} · fit score {active.score} ·
                confidence {active.score >= 85 ? 'tinggi' : 'sedang'}
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-ink-500">
                Kandidat Ukuran
              </h3>
              <div className="space-y-3">
                {CANDIDATES.map((c, i) => {
                  const on = i === selected;
                  const scoreColor =
                    c.noteTone === 'bad' ? 'text-bad' : on ? 'text-[#1e5cd4]' : 'text-ink-600';
                  return (
                    <button
                      key={c.size}
                      onClick={() => setSelected(i)}
                      aria-pressed={on}
                      className={clsx(
                        'flex w-full items-center justify-between rounded-card border p-4 text-left transition-colors',
                        on
                          ? 'border-[#1e5cd4] bg-[#f0f5ff]'
                          : 'border-ink-200 bg-white hover:border-ink-300 hover:bg-ink-50',
                      )}
                    >
                      <div>
                        <div className={clsx('text-[15px]', on ? 'font-bold text-ink-900' : 'font-semibold text-ink-700')}>
                          Ukuran {c.size} · {c.implantCode}
                        </div>
                        <div
                          className={clsx(
                            'mt-1 text-xs',
                            c.noteTone === 'bad'
                              ? 'text-bad'
                              : c.noteTone === 'good'
                              ? 'font-medium text-[#1e5cd4]'
                              : 'text-ink-500',
                          )}
                        >
                          {c.note}
                        </div>
                      </div>
                      <span className={clsx('text-2xl font-bold tabular-nums', scoreColor)}>
                        {c.score}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-ink-500">
                Metrik Fitting · Ukuran {active.size} ({active.implantCode})
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <MetricCard label="SSIM" value={num(met.ssim, fb.ssim as number).toFixed(2)} tone="accent" />
                <MetricCard label="PSNR" value={num(met.psnr, fb.psnr as number).toFixed(1)} unit="dB" />
                <MetricCard label="Dice" value={num(met.dice, fb.dice as number).toFixed(2)} />
                <MetricCard label="RMSE" value={num(met.rmse, fb.rmse as number).toFixed(2)} unit="mm" />
              </div>
            </div>

            <Disclaimer className="text-center" />
          </div>

          <div className="space-y-3 px-6 pb-6">
            <button
              onClick={confirm}
              disabled={confirming}
              className="w-full rounded-lg bg-[#1e5cd4] py-3.5 font-bold text-white transition-colors hover:bg-accent-active disabled:opacity-60"
            >
              {confirming ? 'Menyimpan…' : `Konfirmasi Ukuran ${active.size} (${active.implantCode})`}
            </button>
            <button className="w-full rounded-lg border border-ink-200 bg-white py-3.5 font-semibold text-ink-900 transition-colors hover:bg-ink-50">
              Bandingkan S / M / L / XL
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
