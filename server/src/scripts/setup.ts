import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';

const here = dirname(fileURLToPath(import.meta.url));
const schema = readFileSync(join(here, '../../schema.sql'), 'utf8');
const rid = () => randomBytes(4).toString('hex');

async function main() {
  const c = await pool.connect();
  try {
    console.log('→ applying schema…');
    await c.query(schema);

    console.log('→ wiping data (keep 1 test case)…');
    await c.query('DELETE FROM case_files');
    await c.query('DELETE FROM case_events');
    await c.query('DELETE FROM cases');
    await c.query('DELETE FROM patients');

    console.log('→ seeding user…');
    const hash = await bcrypt.hash('password12', 10);
    await c.query(
      `INSERT INTO users (email, name, org, password_hash)
       VALUES ('a.wibowo@rsudhs.go.id', 'dr. Adi Wibowo', 'RSUD Harapan Sehat', $1)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
      [hash],
    );

    console.log('→ seeding 1 test case…');
    const code = 'KF-2419-0092';
    const pt = await c.query(
      `INSERT INTO patients (nik, full_name, sex, age) VALUES ($1,$2,$3,$4) RETURNING id`,
      ['3273010101580001', 'Siti Rahmawati', 'P', 68],
    );
    const cs = await c.query(
      `INSERT INTO cases (case_code, patient_id, side, status, note, uploaded_at)
       VALUES ($1,$2,'Kanan','ready','Rekonstruksi selesai · menunggu tinjauan', now() - interval '20 min')
       RETURNING id`,
      [code, pt.rows[0].id],
    );
    const caseId = cs.rows[0].id;
    const files = [
      ['nifti', `segmentation-0092-${rid()}.nii.gz`, 'voxel label · 0.5 mm iso · 4.2 MB', 0],
      ['stl', `humanfemur-0092-${rid()}.stl`, '142k triangle · 2.0 MB', 1],
      ['stl', `humantibiafibula-0092-${rid()}.stl`, '138k triangle · 2.0 MB', 2],
    ];
    for (const [kind, filename, meta, sort] of files) {
      await c.query(
        `INSERT INTO case_files (case_id, kind, filename, meta, sort) VALUES ($1,$2,$3,$4,$5)`,
        [caseId, kind, filename, meta, sort],
      );
    }
    await c.query(
      `INSERT INTO case_events (case_id, from_status, to_status, actor) VALUES ($1,NULL,'ready','seed')`,
      [caseId],
    );

    console.log('✓ setup complete. 1 test case (KF-2419-0092). Login: a.wibowo@rsudhs.go.id / password12');
  } finally {
    c.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error('✗ setup failed:', e.message);
  process.exit(1);
});
