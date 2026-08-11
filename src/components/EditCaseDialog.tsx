import { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { Button } from './ui/Button';
import { api, type ApiCase, type CaseImage } from '../lib/api';
import { XRAY_ACCEPT, humanSize, kindLabel, okExt, renderable, toDataUrl } from '../lib/xray';

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

const field =
  'w-full rounded-md border border-ink-300 bg-white px-3 py-2.5 text-sm text-ink-900 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent';

/**
 * Satu petak citra: menampilkan yang tersimpan, dan bisa diganti berkas baru.
 * Versi ringkas dari petak besar di halaman unggah — di dialog ruangnya sempit.
 */
function ImageSlot({
  label,
  current,
  file,
  onFile,
}: {
  label: 'AP' | 'LAT';
  current?: CaseImage;
  file: File | null;
  onFile: (f: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Object URL pratinjau dilepas saat berkas berganti agar tidak bocor.
  useEffect(() => {
    if (!file || !renderable(file)) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function pick(f: File | undefined | null) {
    if (!f) return;
    if (!okExt(f.name)) {
      setErr('Format harus .dcm, .png, atau .jpg');
      onFile(null);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    setErr(null);
    onFile(f);
  }

  // Berkas baru menang atas citra tersimpan; DICOM tidak punya pratinjau.
  const shown = file ? preview : current?.data_url ?? null;
  const caption = file
    ? `${kindLabel(file.name)} · ${humanSize(file.size)}`
    : current?.filename ?? 'belum ada citra';

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-ink-700">{label}</span>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          pick(e.dataTransfer.files[0]);
        }}
        className={clsx(
          'group relative grid aspect-[4/5] w-full place-items-center overflow-hidden rounded-lg border-2 bg-[#111826] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          file ? 'border-solid border-good/60' : err ? 'border-solid border-bad/60' : 'border-dashed border-ink-300 hover:border-accent',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={XRAY_ACCEPT}
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0])}
        />
        {shown ? (
          <img src={shown} alt={`X-ray ${label}`} className="h-full w-full object-contain" />
        ) : (
          <span className="px-2 text-center font-mono text-[10px] text-white/60">
            {current ? 'DICOM · tanpa pratinjau' : 'klik untuk pilih berkas'}
          </span>
        )}
        <span className="absolute inset-x-0 bottom-0 bg-black/55 py-1 text-center text-[10px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
          Ganti citra
        </span>
      </button>
      <p className="truncate text-[11px] text-ink-500" title={caption}>
        {file && <span className="font-semibold text-good">baru · </span>}
        {caption}
      </p>
      {err && <p className="text-[11px] font-medium text-bad">{err}</p>}
    </div>
  );
}

/**
 * Sunting identitas pasien pada satu kasus. Citra X-ray tidak ikut diubah di
 * sini — untuk mengganti citra, buat kasus baru lewat halaman unggah.
 */
export function EditCaseDialog({
  c,
  onClose,
  onSaved,
}: {
  c: ApiCase;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nik, setNik] = useState(c.nik ?? '');
  const [fullName, setFullName] = useState(c.full_name ?? '');
  const [birthDate, setBirthDate] = useState(c.birth_date ?? '');
  const [sex, setSex] = useState<'P' | 'L'>(c.sex);
  const [side, setSide] = useState<'Kanan' | 'Kiri'>(c.side);
  const [ap, setAp] = useState<File | null>(null);
  const [lat, setLat] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const curAp = c.images?.find((i) => i.projection === 'AP');
  const curLat = c.images?.find((i) => i.projection === 'LAT');

  // Esc menutup dialog, sama seperti perilaku <dialog> bawaan browser.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const age = ageFrom(birthDate);
  const ready = nik.length === 16 && !!fullName.trim() && age !== null;

  async function save() {
    setError(null);
    if (!ready) return;
    setBusy(true);
    try {
      // Citra hanya dikirim kalau ada yang diganti; kalau tidak, `images`
      // dibiarkan undefined supaya db.updateCase mempertahankan citra lama.
      let images: { projection: 'AP' | 'LAT'; filename: string; mime: string | null; data_url: string | null }[] | undefined;
      if (ap || lat) {
        const [apUrl, latUrl] = await Promise.all([
          ap ? toDataUrl(ap) : Promise.resolve(curAp?.data_url ?? null),
          lat ? toDataUrl(lat) : Promise.resolve(curLat?.data_url ?? null),
        ]);
        images = [
          {
            projection: 'AP',
            filename: ap?.name ?? curAp?.filename ?? 'ap.png',
            mime: ap?.type || curAp?.mime || null,
            data_url: apUrl,
          },
          {
            projection: 'LAT',
            filename: lat?.name ?? curLat?.filename ?? 'lat.png',
            mime: lat?.type || curLat?.mime || null,
            data_url: latUrl,
          },
        ];
      }

      await api.updateCase(c.id, {
        nik: nik.trim(),
        full_name: fullName.trim(),
        birth_date: birthDate,
        sex,
        side,
        images,
      });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink-900/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Edit data pasien ${c.id}`}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-[440px] overflow-y-auto rounded-card border border-ink-200 bg-white p-6 shadow-card"
      >
        <h2 className="text-lg font-bold text-ink-800">Edit data pasien</h2>
        <p className="mt-1 text-sm text-ink-500">
          Kasus <span className="font-mono font-semibold text-ink-700">{c.id}</span> · usia dihitung
          ulang dari tanggal lahir.
        </p>

        <div className="mt-5 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-ink-700">NIK</span>
            <input
              value={nik}
              inputMode="numeric"
              maxLength={16}
              onChange={(e) => setNik(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="16 digit"
              className={field}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-ink-700">Nama lengkap</span>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nama pasien"
              className={field}
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
                className={field}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-ink-700">Kelamin</span>
              <select value={sex} onChange={(e) => setSex(e.target.value as 'P' | 'L')} className={field}>
                <option value="P">Perempuan</option>
                <option value="L">Laki-laki</option>
              </select>
            </label>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-ink-700">Sisi lutut</span>
            <div className="grid grid-cols-2 gap-1 rounded-lg border border-ink-200 bg-ink-50 p-1">
              {(['Kanan', 'Kiri'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSide(s)}
                  aria-pressed={side === s}
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

          <p className="text-xs text-ink-500">
            Usia: <span className="font-semibold text-ink-700">{age !== null ? `${age} th` : '—'}</span>
          </p>

          <div className="flex flex-col gap-2 border-t border-ink-100 pt-4">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-semibold text-ink-700">Citra X-ray</span>
              <span className="text-[11px] text-ink-400">klik petak untuk mengganti</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <ImageSlot label="AP" current={curAp} file={ap} onFile={setAp} />
              <ImageSlot label="LAT" current={curLat} file={lat} onFile={setLat} />
            </div>
            <p className="text-[11px] text-ink-500">
              Mengganti citra tidak menjalankan ulang rekonstruksi 3D — mesh dan skor fitting
              kasus ini tetap seperti semula.
            </p>
          </div>

          {error && (
            <p className="rounded-md border border-status-errorBg bg-status-errorBg/40 px-3 py-2 text-xs text-status-error">
              {error}
            </p>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Batal
          </Button>
          <Button onClick={save} disabled={!ready || busy}>
            {busy ? 'Menyimpan…' : 'Simpan'}
          </Button>
        </div>
      </div>
    </div>
  );
}
