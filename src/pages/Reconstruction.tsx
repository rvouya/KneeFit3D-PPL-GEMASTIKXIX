import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { AppHeader } from '../components/AppHeader';
import { KneeScene } from '../components/viewer/KneeScene';
import { ControlsLegend } from '../components/viewer/ControlsLegend';
import { api, type ApiCase, type CaseFile } from '../lib/api';

function FileRow({ file }: { file: CaseFile }) {
  const isStl = file.kind === 'stl';
  return (
    <div className="group flex items-center justify-between rounded-lg border border-ink-200 p-3 hover:border-ink-300 hover:bg-ink-50">
      <div className="flex items-center gap-3">
        <span
          className={clsx(
            'rounded px-2 py-1 text-[10px] font-bold leading-none',
            isStl ? 'bg-[#fff7ed] text-[#ea580c]' : 'bg-accent-softer text-accent',
          )}
        >
          {isStl ? 'STL' : 'NIFTI'}
        </span>
        <div>
          <div className="font-mono text-sm font-bold text-ink-700">{file.filename}</div>
          <div className="text-xs text-ink-500">{file.meta}</div>
        </div>
      </div>
      <span className="text-ink-400 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 3v10m0 0-3.5-3.5M10 13l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 15v1.5A1.5 1.5 0 0 0 5.5 18h9a1.5 1.5 0 0 0 1.5-1.5V15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </span>
    </div>
  );
}

/** Halaman Rekonstruksi 3D — node 3:1507 (page terpisah). */
export function Reconstruction() {
  const { id } = useParams();
  const caseId = id ? decodeURIComponent(id) : 'KF-2419-0092';
  const navigate = useNavigate();
  const [c, setC] = useState<ApiCase | null>(null);

  useEffect(() => {
    api.getCase(caseId).then(setC).catch(() => {});
  }, [caseId]);

  const files = c?.files ?? [];
  const nifti = files.filter((f) => f.kind === 'nifti');
  const stl = files.filter((f) => f.kind === 'stl');

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-ink-50">
      <AppHeader crumbs={[{ label: 'Output' }, { label: 'Rekonstruksi 3D' }, { label: caseId, muted: true }]} />

      <div className="flex min-h-0 flex-1 gap-4 bg-[#f9fafb] p-4">
        <section className="relative min-w-0 flex-1 overflow-hidden rounded-card bg-[#8ba0c8] shadow-card">
          <KneeScene />

          <div className="pointer-events-none absolute inset-0 font-mono text-sm font-semibold text-white/70">
            <span className="absolute left-1/2 top-6 -translate-x-1/2">S</span>
            <span className="absolute bottom-16 left-1/2 -translate-x-1/2">I</span>
            <span className="absolute left-8 top-1/2">A</span>
            <span className="absolute right-8 top-1/2">P</span>
          </div>

          <div className="absolute inset-x-4 bottom-4 flex justify-center">
            <ControlsLegend />
          </div>
        </section>

        <aside className="flex w-[420px] shrink-0 flex-col overflow-hidden rounded-card border border-ink-200 bg-white shadow-card">
          <div className="border-b border-ink-100 px-6 py-6">
            <h2 className="text-xl font-bold text-ink-800">Rekonstruksi selesai</h2>
            <p className="mt-1 text-sm text-ink-600">
              Dari AP + Lateral · 12 dtk · <span className="font-bold text-good">confidence 0.94</span>
            </p>
          </div>

          <div className="flex-1 space-y-6 overflow-auto p-6">
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-ink-400">Volume Segmentasi</h3>
              {nifti.length ? nifti.map((f) => <FileRow key={f.filename} file={f} />) : (
                <div className="h-16 animate-pulse rounded-lg bg-ink-100" />
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-ink-400">Mesh Permukaan (STL)</h3>
              <div className="space-y-3">
                {stl.length ? stl.map((f) => <FileRow key={f.filename} file={f} />) : (
                  <>
                    <div className="h-16 animate-pulse rounded-lg bg-ink-100" />
                    <div className="h-16 animate-pulse rounded-lg bg-ink-100" />
                  </>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-ink-100 bg-ink-50 p-4 text-xs leading-relaxed text-ink-600">
              <span className="font-bold text-ink-800">Orientasi:</span> A (anterior) · P (posterior) ·
              I (inferior), sesuai kotak batas segmentasi. Skala mm dari pixel spacing DICOM.
            </div>
          </div>

          <div className="space-y-3 px-6 pb-6">
            <button
              onClick={() => navigate(`/cases/${encodeURIComponent(caseId)}/fitting`)}
              className="flex w-full items-center justify-center rounded-lg bg-accent px-4 py-2.5 font-bold text-white transition-colors hover:bg-accent-hover"
            >
              Lanjut ke virtual fitting →
            </button>
            <button className="flex w-full items-center justify-center rounded-lg border border-ink-300 bg-white px-4 py-2.5 font-bold text-ink-700 transition-colors hover:bg-ink-50">
              Unduh semua (.zip)
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
