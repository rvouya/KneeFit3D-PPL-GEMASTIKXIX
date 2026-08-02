import { clsx } from 'clsx';

export function Disclaimer({ className }: { className?: string }) {
  return (
    <p
      className={clsx(
        'rounded-lg bg-ink-100 px-3 py-2 text-xs leading-relaxed text-ink-500',
        className,
      )}
    >
      Prediksi estimatif; keputusan akhir tetap pada dokter.
    </p>
  );
}
