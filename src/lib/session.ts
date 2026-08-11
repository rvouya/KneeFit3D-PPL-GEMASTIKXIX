/**
 * Sesi operator, disimpan di `sessionStorage` — ikut hilang saat tab ditutup.
 *
 * Ini bukan kontrol keamanan: mode standalone tidak punya server, jadi tidak
 * ada token yang bisa diverifikasi. Gunanya supaya aplikasi tahu siapa yang
 * sedang masuk dan tombol keluar benar-benar mengakhiri sesi.
 */

import type { User } from './api';

const KEY = 'kf_user';

export function getSession(): User | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const u = JSON.parse(raw) as Partial<User>;
    // Baris lama / rusak diperlakukan sebagai "belum masuk", bukan dibiarkan
    // lolos setengah terisi ke header.
    return u && typeof u.email === 'string' && typeof u.name === 'string' ? (u as User) : null;
  } catch {
    return null;
  }
}

export function setSession(user: User): void {
  sessionStorage.setItem(KEY, JSON.stringify(user));
}

export function clearSession(): void {
  sessionStorage.removeItem(KEY);
}

/** "dr. Adi Wibowo" → "AW". Gelar berakhiran titik dilewati. */
export function initialsOf(name: string): string {
  const words = name.split(/\s+/).filter((w) => w && !w.endsWith('.'));
  const picked = (words.length ? words : name.split(/\s+/)).slice(0, 2);
  return picked.map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';
}
