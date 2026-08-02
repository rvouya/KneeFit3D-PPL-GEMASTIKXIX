import type { CaseStatus } from '../components/ui/StatusBadge';
import type { CaseAction } from './api';

export type RowButton = {
  label: string;
  kind: 'primary' | 'secondary' | 'ghost';
  /** navigate target (function of case code) */
  to?: (code: string) => string;
  /** server transition to POST */
  action?: CaseAction;
};

/**
 * Conditional buttons per status (state machine).
 * Documented in USECASE.md.
 */
export const STATUS_BUTTONS: Record<CaseStatus, RowButton[]> = {
  queued: [{ label: 'Batalkan', kind: 'ghost', action: 'cancel' }],
  processing: [{ label: 'Batalkan', kind: 'ghost', action: 'cancel' }],
  ready: [{ label: 'Tinjau', kind: 'primary', to: (c) => `/cases/${encodeURIComponent(c)}/reconstruction` }],
  reviewed: [{ label: 'Laporan', kind: 'secondary', to: (c) => `/cases/${encodeURIComponent(c)}/report` }],
  error: [{ label: 'Unggah ulang', kind: 'secondary', to: (c) => `/cases/${encodeURIComponent(c)}/upload` }],
  canceled: [{ label: 'Unggah ulang', kind: 'secondary', action: 'reset' }],
};
