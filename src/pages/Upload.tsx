import { useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { AppHeader } from '../components/AppHeader';
import { Button } from '../components/ui/Button';
import { api } from '../lib/api';
import { XRAY_ACCEPT, humanSize, kindLabel, okExt, renderable, toDataUrl } from '../lib/xray';

function Slot({
  label,
  file,
  onFile,
}: {
  label: 'AP' | 'LATERAL';
  file: File | null;
  onFile: (f: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // object URL pratinjau dilepas saat berkas berganti agar tidak bocor
  useEffect(() => {
    if (!file || !renderable(file)) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function pick(f: File | undefined | null) {
    if (!f) return;
    if (!okExt(f.name)) {
      setErr('Format harus .dcm atau .png');
      onFile(null);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    setErr(null);
    onFile(f);
  }

  return (
    <div className="flex flex-col">
      <div className="mb-2">
        <span className="rounded bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">{label}</span>
      </div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
        className={clsx(
          'relative grid aspect-[4/5] w-full place-items-center overflow-hidden rounded-xl border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          file ? 'border-solid border-good/40 bg-good/5'
            : err ? 'border-solid border-bad/50 bg-bad/5'
            : drag ? 'border-dashed border-accent bg-accent-softer/60'
            : 'border-dashed border-ink-300 hover:border-accent hover:bg-accent-softer/40',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={XRAY_ACCEPT}
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0])}
        />
        {file ? (
          <div className="flex flex-col items-center gap-2 px-6 text-center">
            {preview ? (
              <img
                src={preview}
                alt={`Pratinjau X-ray ${label}`}
                className="h-28 w-24 rounded-lg border border-ink-200 object-cover"
              />
            ) : (
              <div className="grid h-28 w-24 place-items-center rounded-lg bg-ink-200 text-[11px] text-ink-500">
                DICOM · tanpa pratinjau
              </div>
            )}
            <div className="font-mono text-sm font-semibold text-ink-800">{file.name}</div>
            <div className="text-xs text-ink-500">
              {kindLabel(file.name)} · {humanSize(file.size)}
            </div>
            <span className="rounded-full bg-good/10 px-2 py-0.5 text-[11px] font-medium text-good">✓ valid</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 px-6 text-center">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-ink-100 text-ink-500">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                <path d="M10 13V4m0 0L6.5 7.5M10 4l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 13v2.5A1.5 1.5 0 0 0 5.5 17h9a1.5 1.5 0 0 0 1.5-1.5V13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-sm font-medium text-ink-700">Seret berkas ke sini</p>
            <p className="text-xs text-ink-500">atau klik untuk memilih</p>
            <p className="text-xs text-ink-400">.dcm · .png (16-bit)</p>
            {err && <p className="text-xs font-medium text-bad">{err}</p>}
          </div>
        )}
      </button>
    </div>
  );
}

/** Umur penuh tahun dari tanggal lahir ISO; null bila tanggal tidak masuk akal. */
function ageFrom(iso: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const b = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) years -= 1;
  return years > 0 && years < 130 ? years : null;
}

/** Halaman unggah citra X-ray + identitas pasien. */
export function Upload() {
  const navigate = useNavigate();
  const [ap, setAp] = useState<File | null>(null);
  const [lat, setLat] = useState<File | null>(null);
  const [nik, setNik] = useState('');
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [sex, setSex] = useState<'P' | 'L'>('P');
  const [side, setSide] = useState<'Kanan' | 'Kiri'>('Kanan');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const age = ageFrom(birthDate);
  const ready = !!ap && !!lat && nik.length === 16 && !!fullName.trim() && age !== null;

  async function submit() {
    setError(null);
    if (!ready || !ap || !lat) return;
    setBusy(true);
    try {
      const [apUrl, latUrl] = await Promise.all([toDataUrl(ap), toDataUrl(lat)]);
      const c = await api.createCase({
        nik: nik.trim(),
        full_name: fullName.trim(),
        birth_date: birthDate,
        sex,
        side,
        images: [
          { projection: 'AP', filename: ap.name, mime: ap.type || null, data_url: apUrl },
          { projection: 'LAT', filename: lat.name, mime: lat.type || null, data_url: latUrl },
        ],
      });
      navigate(`/cases/${encodeURIComponent(c.id)}/reconstruction`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink-50">
      <AppHeader crumbs={[{ label: 'Dashboard', to: '/worklist' }, { label: 'Input X-ray' }]} />

      <main className="mx-auto max-w-[1120px] px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-ink-800">Unggah citra X-ray</h1>
          <p className="mt-1 text-sm text-ink-500">
            Rekonstruksi 3D memerlukan sepasang proyeksi ortogonal: AP dan Lateral pada lutut yang sama.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="grid gap-6 rounded-card border border-ink-200 bg-white p-6 shadow-card sm:grid-cols-2">
            <Slot label="AP" file={ap} onFile={setAp} />
            <Slot label="LATERAL" file={lat} onFile={setLat} />
          </div>

          <aside className="flex flex-col gap-4">
            <div className="rounded-card border border-ink-200 bg-white p-5 shadow-card">
              <h2 className="text-[11px] font-bold uppercase tracking-wide text-ink-500">Identitas pasien</h2>

              <div className="mt-4 flex flex-col gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-ink-700">NIK</span>
                  <input
                    value={nik}
                    inputMode="numeric"
                    maxLength={16}
                    onChange={(e) => setNik(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="16 digit"
                    className="w-full rounded-md border border-ink-300 bg-white px-3 py-2.5 text-sm text-ink-900 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-ink-700">Nama lengkap</span>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nama pasien"
                    className="w-full rounded-md border border-ink-300 bg-white px-3 py-2.5 text-sm text-ink-900 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-ink-700">Tanggal lahir</span>
                    <input
                      type="date"
                      value={birthDate}
                      max={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full rounded-md border border-ink-300 bg-white px-3 py-2.5 text-sm text-ink-900 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-ink-700">Kelamin</span>
                    <select
                      value={sex}
                      onChange={(e) => setSex(e.target.value as 'P' | 'L')}
                      className="w-full rounded-md border border-ink-300 bg-white px-3 py-2.5 text-sm text-ink-900 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                      <option value="P">Perempuan</option>
                      <option value="L">Laki-laki</option>
                    </select>
                  </label>
                </div>

              </div>
            </div>

            <div className="rounded-card border border-ink-200 bg-white p-5 shadow-card">
              <h2 className="text-[11px] font-bold uppercase tracking-wide text-ink-500">Sisi lutut</h2>
              <div className="mt-4 grid grid-cols-2 gap-1 rounded-lg border border-ink-200 bg-ink-50 p-1">
                {(['Kanan', 'Kiri'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSide(s)}
                    className={clsx(
                      'rounded-md py-2 text-sm font-semibold transition-colors',
                      side === s ? 'bg-white text-accent shadow-sm' : 'text-ink-500 hover:text-ink-700',
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-card border border-ink-200 bg-white p-5 shadow-card">
              {error && (
                <p className="mb-3 rounded-md border border-status-errorBg bg-status-errorBg/40 px-3 py-2 text-xs text-status-error">
                  {error}
                </p>
              )}
              <Button size="lg" className="w-full" disabled={!ready || busy} onClick={submit}>
                {busy ? 'Memproses…' : 'Rekonstruksi 3D'}
              </Button>
              <p className="mt-2 text-center text-[11px] text-ink-400">
                {ready ? 'Siap diproses.' : 'Lengkapi kedua proyeksi & data pasien untuk melanjutkan.'}
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
