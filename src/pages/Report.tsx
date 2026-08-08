import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { Button } from '../components/ui/Button';
import { MetricCard } from '../components/ui/MetricCard';
import { api, formatUploaded, type ApiCase } from '../lib/api';

/** Citra X-ray asli bila tersedia; DICOM/berkas hilang jatuh ke placeholder. */
function XrayThumb({ label, src, caption }: { label: string; src?: string | null; caption?: string }) {
  return (
    <div className="relative aspect-[4/5] overflow-hidden rounded-lg border border-ink-200 bg-[#111826]">
      {src ? (
        <img src={src} alt={`X-ray ${label}`} className="h-full w-full object-contain" />
      ) : (
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-[#111826] to-[#1f2a3d]" />
          <div className="absolute inset-0 opacity-70 [background:radial-gradient(60%_70%_at_50%_45%,rgba(226,232,240,0.35),transparent_70%)]" />
          {caption && (
            <span className="absolute inset-x-2 bottom-2 text-center font-mono text-[10px] text-white/70">
              {caption}
            </span>
          )}
        </>
      )}
      <span className="absolute left-2 top-2 rounded bg-black/40 px-1.5 py-0.5 font-mono text-[10px] text-white/80">
        {label}
      </span>
    </div>
  );
}

const SEX_LABEL: Record<string, string> = { P: 'Perempuan', L: 'Laki-laki' };

/** `1958-01-01` → `01 Januari 1958`; UTC supaya tanggalnya tidak bergeser. */
function formatBirthDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC',
  });
}

/** Halaman laporan (exportable PDF) — layar ke-5 CONTEXT. */
export function Report() {
  const { id } = useParams();
  const caseId = id ? decodeURIComponent(id) : 'KF-2419-0092';
  const navigate = useNavigate();
  const [c, setC] = useState<ApiCase | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getCase(caseId).then(setC).catch((e) => setError((e as Error).message));
  }, [caseId]);

  const ap = c?.images?.find((i) => i.projection === 'AP');
  const lat = c?.images?.find((i) => i.projection === 'LAT');

  return (
    <div className="min-h-screen bg-ink-50">
      <div className="print:hidden">
        <AppHeader
          crumbs={[
            { label: 'Output' },
            { label: 'Laporan' },
            { label: caseId, muted: true },
          ]}
        />
        <div className="mx-auto flex max-w-[860px] items-center justify-between px-6 pt-6">
          <button
            onClick={() => navigate('/worklist')}
            className="flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-ink-800"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="m10 4-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Kembali ke worklist
          </button>
          <Button onClick={() => window.print()}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M4 6V2.5h8V6M4 12H3a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1M4 10h8v3.5H4V10Z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Ekspor PDF
          </Button>
        </div>
      </div>

      <div className="mx-auto my-6 max-w-[860px] rounded-card border border-ink-200 bg-white p-10 shadow-card print:my-0 print:border-0 print:shadow-none">
        {error && (
          <p className="mb-4 rounded-md border border-status-errorBg bg-status-errorBg/40 px-3 py-2 text-xs text-status-error">
            {error}
          </p>
        )}

        <header className="flex items-start justify-between border-b border-ink-200 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-accent px-1.5 py-0.5 text-[11px] font-bold text-white">K3</span>
              <span className="text-sm font-bold text-ink-800">KneeFit3D</span>
            </div>
            <h1 className="mt-3 text-2xl font-bold text-ink-900">
              Laporan Perencanaan Praoperasi TKA
            </h1>
            <p className="mt-1 text-sm text-ink-500">
              Alat bantu keputusan berbasis AI · rekonstruksi 3D & rekomendasi implan
            </p>
          </div>
          <div className="text-right text-xs text-ink-500">
            <div className="font-mono text-sm font-bold text-ink-800">{caseId}</div>
            <div className="mt-1">RSUD Harapan Sehat</div>
            <div>Ortopedi</div>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-x-8 gap-y-3 py-6 text-sm sm:grid-cols-4">
          {[
            ['ID Kasus', caseId],
            ['Nama pasien', c?.full_name || '—'],
            ['NIK', c?.nik || '—'],
            ['Tanggal lahir', formatBirthDate(c?.birth_date)],
            ['Kelamin · usia', c ? `${SEX_LABEL[c.sex] ?? c.sex} · ${c.age} th` : '—'],
            ['Sisi lutut', c?.side ?? '—'],
            ['Tanggal', c ? formatUploaded(c.uploaded_at) : '—'],
            ['Dokter', 'dr. Adi Wibowo'],
            ['Status', c?.status ?? '—'],
          ].map(([k, v]) => (
            <div key={k}>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">{k}</div>
              <div className="mt-0.5 font-medium text-ink-800">{v}</div>
            </div>
          ))}
        </section>

        <section className="border-t border-ink-100 py-6">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-500">Citra input</h2>
          <div className="grid max-w-md grid-cols-2 gap-4">
            <div>
              <XrayThumb label="AP" src={ap?.data_url} caption={ap ? 'DICOM · pratinjau tidak tersedia' : undefined} />
              <p className="mt-1 truncate text-center text-xs text-ink-500">{ap?.filename ?? 'X-ray AP'}</p>
            </div>
            <div>
              <XrayThumb label="LAT" src={lat?.data_url} caption={lat ? 'DICOM · pratinjau tidak tersedia' : undefined} />
              <p className="mt-1 truncate text-center text-xs text-ink-500">{lat?.filename ?? 'X-ray Lateral'}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 border-t border-ink-100 py-6 sm:grid-cols-2">
          <div>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-500">Snapshot rekonstruksi 3D</h2>
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-[#17243c]">
              {c?.snapshot ? (
                <img
                  src={c.snapshot}
                  alt="Snapshot rekonstruksi 3D dengan implan"
                  className="h-full w-full object-contain"
                />
              ) : (
                <>
                  <div className="absolute inset-0 bg-[#8ba0c8]" />
                  <div className="absolute inset-0 [background:radial-gradient(50%_60%_at_50%_45%,rgba(231,216,168,0.9),transparent_65%)]" />
                  <span className="absolute inset-x-2 bottom-6 text-center font-mono text-[10px] text-white/80">
                    snapshot tersimpan saat konfirmasi ukuran
                  </span>
                </>
              )}
              <span className="absolute bottom-2 left-2 rounded bg-black/40 px-1.5 py-0.5 font-mono text-[10px] text-white/80">
                confidence 0.94
              </span>
            </div>
          </div>
          <div>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-500">Rekomendasi implan final</h2>
            <div className="rounded-card bg-[#1e5cd4] p-5 text-white">
              <div className="text-[26px] font-bold leading-8">Femur M1 · Tibia M1</div>
              <div className="mt-1 text-sm text-[#eff6ff]">GCK4 M1 · ukuran M · fit score 92 · confidence tinggi</div>
            </div>
          </div>
        </section>

        <section className="border-t border-ink-100 py-6">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-500">Implant Fit Scoring</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard label="SSIM" value="0.88" tone="accent" />
            <MetricCard label="PSNR" value="35.7" unit="dB" />
            <MetricCard label="Dice" value="0.94" />
            <MetricCard label="RMSE" value="0.82" unit="mm" />
          </div>
        </section>

        <section className="border-t border-ink-200 pt-6">
          <p className="rounded-lg bg-ink-100 px-4 py-3 text-xs leading-relaxed text-ink-500">
            Rekomendasi bersifat estimatif dan dihasilkan oleh model AI sebagai alat
            bantu keputusan. Keputusan akhir pemilihan implan tetap pada dokter yang
            merawat. Laporan ini memuat identitas pasien — perlakukan sebagai dokumen
            rekam medis dan batasi peredarannya.
          </p>
          <div className="mt-8 flex justify-between text-sm">
            <div>
              <div className="h-10 w-48 border-b border-ink-300" />
              <div className="mt-1 text-ink-600">Dokter penanggung jawab</div>
            </div>
            <div className="text-right text-xs text-ink-400">
              <div>Dibuat: {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
              <div>KneeFit3D · audit-logged</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
