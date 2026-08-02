import type { CaseStatus } from '../components/ui/StatusBadge';

export type Case = {
  id: string;
  sex: 'P' | 'L';
  age: number;
  side: 'Kanan' | 'Kiri';
  uploaded: string;
  status: CaseStatus;
  progress?: { label: string; value: number };
  note?: string;
  noteTone?: 'muted' | 'error';
  action: 'review' | 'report' | 'reupload' | 'cancel';
};

export const CASES: Case[] = [
  {
    id: 'KF - 2419 - 0092',
    sex: 'P', age: 68, side: 'Kanan', uploaded: 'Hari ini 09:41',
    status: 'ready',
    note: 'Rekonstruksi selesai · menunggu tinjauan', noteTone: 'muted',
    action: 'review',
  },
  {
    id: 'KF - 2419 - 0091',
    sex: 'L', age: 74, side: 'Kiri', uploaded: 'Hari ini 09:12',
    status: 'processing',
    progress: { label: 'Rekonstruksi 3D · 64%', value: 64 },
    action: 'cancel',
  },
  {
    id: 'KF - 2419 - 0090',
    sex: 'P', age: 61, side: 'Kanan', uploaded: 'Hari ini 08:58',
    status: 'processing',
    progress: { label: 'Deteksi landmark · 18%', value: 18 },
    action: 'cancel',
  },
  {
    id: 'KF - 2419 - 0089',
    sex: 'L', age: 70, side: 'Kiri', uploaded: 'Hari ini 08:31',
    status: 'queued',
    action: 'cancel',
  },
  {
    id: 'KF - 2419 - 0087',
    sex: 'P', age: 68, side: 'Kanan', uploaded: 'Kemarin 15:44',
    status: 'reviewed',
    note: 'Final: GenuFlex CR · Femur F4 / Tibia T3', noteTone: 'muted',
    action: 'report',
  },
  {
    id: 'KF - 2419 - 0086',
    sex: 'L', age: 66, side: 'Kanan', uploaded: 'Kemarin 14:02',
    status: 'error',
    note: 'Kualitas citra lateral tidak memadai (kontras rendah)', noteTone: 'error',
    action: 'reupload',
  },
  {
    id: 'KF - 2419 - 0085',
    sex: 'P', age: 72, side: 'Kiri', uploaded: 'Kemarin 11:20',
    status: 'ready',
    note: 'Rekonstruksi selesai · menunggu tinjauan', noteTone: 'muted',
    action: 'review',
  },
];
