import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { clsx } from 'clsx';
import { AppHeader } from '../components/AppHeader';
import { ControlsLegend } from '../components/viewer/ControlsLegend';
import { KneeScene } from '../components/viewer/KneeScene';
import { MetricCard } from '../components/ui/MetricCard';
import { Disclaimer } from '../components/Disclaimer';
import { api } from '../lib/api';

type Candidate = {
  size: string;
  note: string;
  noteTone: 'good' | 'muted' | 'bad';
  score: number;
};

const CANDIDATES: Candidate[] = [
  { size: 'Ukuran B', note: 'Direkomendasikan', noteTone: 'good', score: 92 },
  { size: 'Ukuran A', note: 'Undercoverage ML 2.8%', noteTone: 'muted', score: 78 },
  { size: 'Ukuran C', note: 'Overhang medial 3.4 mm', noteTone: 'bad', score: 64 },
];

/** Virtual Fitting — rekomendasi ukuran implan + fit scoring, node 3:1338. */
export function VirtualFitting() {
  const { id } = useParams();
  const navigate = useNavigate();
  const caseId = id ? decodeURIComponent(id) : 'KF-2419-0092';
  const [selected, setSelected] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const active = CANDIDATES[selected];

  async function confirm() {
    setConfirming(true);
    try {
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
          <KneeScene implant />

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
                <span>Femur {active.size.split(' ')[1]}</span>
                <span className="text-xl text-[#bfdbfe]">•</span>
                <span>Tibia {active.size.split(' ')[1]}</span>
              </div>
              <p className="mt-1 text-sm text-[#eff6ff]">
                Fit score {active.score} · confidence {active.score >= 85 ? 'tinggi' : 'sedang'}
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
                          {c.size}
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
                Metrik Fitting · {active.size}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <MetricCard label="RMSE global" value="0.82" unit="mm" />
                <MetricCard label="Coverage tibia" value="96.9" unit="%" />
                <MetricCard label="Max overhang" value="1.6" unit="mm" />
                <MetricCard label="Risiko notching" value="Rendah" tone="accent" />
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
              {confirming ? 'Menyimpan…' : `Konfirmasi ${active.size}`}
            </button>
            <button className="w-full rounded-lg border border-ink-200 bg-white py-3.5 font-semibold text-ink-900 transition-colors hover:bg-ink-50">
              Bandingkan A / B / C
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
