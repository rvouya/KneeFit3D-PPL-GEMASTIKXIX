/**
 * Data statis yang dulu di-seed ke PostgreSQL (`server/src/scripts/setup.ts`).
 * Dipakai mode standalone: tidak ada database, semua ikut di dalam bundle.
 */

// Relatif, bukan absolut: di-resolve `asset()` di KneeScene saat model dimuat.
export const FEMUR_URL = 'models/femur.stl';
export const TIBIA_URL = 'models/tibia-fibula.stl';

export type RegistryEntry = {
  nik: string;
  full_name: string;
  birth_date: string;
  sex: 'P' | 'L';
  femur_url: string;
  tibia_url: string;
};

/** Pasien terdaftar + mesh 3D miliknya. Didokumentasikan di docs/DATA-PASIEN-DEMO.md. */
export const PATIENT_REGISTRY: RegistryEntry[] = [
  { nik: '3273010101580001', full_name: 'Siti Rahmawati',   birth_date: '1958-01-01', sex: 'P', femur_url: FEMUR_URL, tibia_url: TIBIA_URL },
  { nik: '3173042509520007', full_name: 'Bambang Suryana',  birth_date: '1952-09-25', sex: 'L', femur_url: FEMUR_URL, tibia_url: TIBIA_URL },
  { nik: '3578011407610012', full_name: 'Endang Wulandari', birth_date: '1961-07-14', sex: 'P', femur_url: FEMUR_URL, tibia_url: TIBIA_URL },
  { nik: '3374061203550004', full_name: 'Hartono Prasetyo', birth_date: '1955-03-12', sex: 'L', femur_url: FEMUR_URL, tibia_url: TIBIA_URL },
];

/** Mesh yang dipakai kalau identitas pasien tidak cocok entri registry manapun. */
export const DEFAULT_MESH = { femur_url: FEMUR_URL, tibia_url: TIBIA_URL };

/** Cari mesh milik pasien: cocok NIK + nama + tanggal lahir + kelamin, else mesh default. */
export function meshFor(nik: string, fullName: string, birthDate: string, sex: string) {
  const hit = PATIENT_REGISTRY.find(
    (r) =>
      r.nik === nik &&
      r.full_name.toLowerCase() === fullName.toLowerCase() &&
      r.birth_date === birthDate &&
      r.sex === sex,
  );
  return hit ?? DEFAULT_MESH;
}

/**
 * Akun operator demo. Mode standalone tidak punya server, jadi tidak ada hash
 * bcrypt — kata sandi dibandingkan apa adanya di browser. Ini gerbang demo,
 * bukan kontrol keamanan: siapa pun yang membuka bundle bisa membacanya.
 * Jangan menaruh kredensial asli di sini.
 */
export const DEMO_USER = {
  id: 1,
  email: 'a.wibowo@rsudhs.go.id',
  password: 'password12',
  name: 'dr. Adi Wibowo',
  org: 'RSUD Harapan Sehat',
};
