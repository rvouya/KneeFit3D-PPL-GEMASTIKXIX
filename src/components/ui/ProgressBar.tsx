export function ProgressBar({ value }: { value: number }) {
  return (
    <div
      className="h-1.5 w-full max-w-[180px] overflow-hidden rounded-full bg-ink-200"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-status-procBar transition-[width]"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}
