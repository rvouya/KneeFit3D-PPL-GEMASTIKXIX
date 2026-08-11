/**
 * Penanganan berkas citra X-ray, dipakai bersama halaman unggah dan dialog
 * edit. Dulu fungsi-fungsi ini hidup sebagai helper lokal di `pages/Upload.tsx`.
 */

/** Nilai untuk atribut `accept` pada <input type="file">. */
export const XRAY_ACCEPT = '.dcm,.png,.jpg,.jpeg';

export const okExt = (name: string) => /\.(dcm|png|jpe?g)$/i.test(name);

/** DICOM tidak bisa dirender <img>, jadi hanya PNG/JPEG yang dijadikan data URL. */
export const renderable = (f: File) => /\.(png|jpe?g)$/i.test(f.name);

export function toDataUrl(f: File): Promise<string | null> {
  if (!renderable(f)) return Promise.resolve(null);
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(typeof r.result === 'string' ? r.result : null);
    r.onerror = () => resolve(null);
    r.readAsDataURL(f);
  });
}

export function humanSize(bytes: number) {
  if (bytes > 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1e3))} KB`;
}

/** "xray-ap.DCM" → "DICOM"; dipakai sebagai label jenis berkas. */
export function kindLabel(name: string) {
  if (/\.dcm$/i.test(name)) return 'DICOM';
  return /\.png$/i.test(name) ? 'PNG' : 'JPEG';
}
