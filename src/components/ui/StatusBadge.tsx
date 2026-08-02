import { clsx } from 'clsx';

export type CaseStatus =
  | 'queued'
  | 'processing'
  | 'ready'
  | 'reviewed'
  | 'error'
  | 'canceled';

const map: Record<CaseStatus, { label: string; cls: string }> = {
  queued: { label: 'Queued', cls: 'bg-status-queuedBg text-status-queued' },
  processing: { label: 'Processing', cls: 'bg-status-procBg text-status-proc' },
  ready: { label: 'Ready for review', cls: 'bg-status-readyBg text-status-ready' },
  reviewed: { label: 'Reviewed', cls: 'bg-status-reviewedBg text-status-reviewed' },
  error: { label: 'Error', cls: 'bg-status-errorBg text-status-error' },
  canceled: { label: 'Dibatalkan', cls: 'bg-ink-200 text-ink-500' },
};

export function StatusBadge({ status }: { status: CaseStatus }) {
  const { label, cls } = map[status];
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
        cls,
      )}
    >
      {label}
    </span>
  );
}
