import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { pool, query } from '../db.js';
import { runPipeline } from '../ml.js';

export const casesRouter = Router();

const SELECT = `
  SELECT c.case_code AS id, p.sex, p.age, p.nik, p.full_name,
         c.side, c.status, c.progress_stage, c.progress_pct, c.note,
         c.uploaded_at
  FROM cases c JOIN patients p ON p.id = c.patient_id
`;

const TRANSITIONS: Record<string, { from: string[]; to: string }> = {
  cancel:  { from: ['queued', 'processing'], to: 'canceled' },
  review:  { from: ['ready'], to: 'reviewed' },
  reset:   { from: ['error', 'canceled'], to: 'queued' },
  process: { from: ['queued'], to: 'processing' },
  finish:  { from: ['processing'], to: 'ready' },
};

const NOTE_ON: Record<string, string | null> = {
  canceled: 'Dibatalkan operator',
  reviewed: 'Rekomendasi dikonfirmasi',
  queued: null,
  processing: 'Rekonstruksi 3D',
  ready: 'Rekonstruksi selesai · menunggu tinjauan',
};

const rid = () => randomBytes(4).toString('hex');

/** Generated output files with unique, non-redundant names. */
function outputFiles(caseCode: string) {
  const digits = caseCode.match(/[0-9]+$/)?.[0] ?? '0000';
  return [
    { kind: 'nifti', filename: `segmentation-${digits}-${rid()}.nii.gz`, meta: 'voxel label · 0.5 mm iso · 4.2 MB', sort: 0 },
    { kind: 'stl',   filename: `humanfemur-${digits}-${rid()}.stl`,       meta: '142k triangle · 2.0 MB',        sort: 1 },
    { kind: 'stl',   filename: `humantibiafibula-${digits}-${rid()}.stl`, meta: '138k triangle · 2.0 MB',        sort: 2 },
  ];
}

async function filesFor(code: string) {
  const { rows } = await query(
    `SELECT f.kind, f.filename, f.meta FROM case_files f
     JOIN cases c ON c.id = f.case_id WHERE c.case_code = $1 ORDER BY f.sort`,
    [code],
  );
  return rows;
}

casesRouter.get('/', async (req, res) => {
  const { status, q } = req.query;
  const where: string[] = [];
  const params: unknown[] = [];
  if (status && status !== 'all') {
    params.push(status);
    where.push(`c.status = $${params.length}`);
  }
  if (q) {
    params.push(`%${String(q).toLowerCase()}%`);
    where.push(`(LOWER(c.case_code) LIKE $${params.length} OR LOWER(c.side) LIKE $${params.length} OR LOWER(COALESCE(p.full_name,'')) LIKE $${params.length})`);
  }
  const sql = SELECT + (where.length ? ` WHERE ${where.join(' AND ')}` : '') + ' ORDER BY c.uploaded_at DESC';
  try {
    const [list, counts] = await Promise.all([
      query(sql, params),
      query(`SELECT status, COUNT(*)::int AS n FROM cases GROUP BY status`),
    ]);
    const byStatus: Record<string, number> = {};
    let total = 0;
    for (const r of counts.rows) { byStatus[r.status] = r.n; total += r.n; }
    res.json({ cases: list.rows, counts: { total, byStatus } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Gagal memuat kasus.' });
  }
});

casesRouter.get('/:code', async (req, res) => {
  try {
    const { rows } = await query(SELECT + ' WHERE c.case_code = $1', [req.params.code]);
    if (!rows[0]) return res.status(404).json({ error: 'Kasus tidak ditemukan.' });
    res.json({ ...rows[0], files: await filesFor(req.params.code) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Gagal memuat kasus.' });
  }
});

// implant sizing + fit scoring for a case (stage 3 & 4 output)
casesRouter.get('/:code/fitting', async (req, res) => {
  try {
    const cand = await query(
      `SELECT ic.size, ic.score, ic.note, ic.recommended FROM implant_candidates ic
       JOIN cases c ON c.id = ic.case_id WHERE c.case_code = $1 ORDER BY ic.score DESC`,
      [req.params.code],
    );
    const met = await query(
      `SELECT fm.size, fm.rmse, fm.coverage_tibia, fm.max_overhang, fm.notching_risk, fm.fit_score
       FROM fit_metrics fm JOIN cases c ON c.id = fm.case_id WHERE c.case_code = $1`,
      [req.params.code],
    );
    res.json({ candidates: cand.rows, metrics: met.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Gagal memuat fitting.' });
  }
});

// create case from upload metadata + generate output files
casesRouter.post('/', async (req, res) => {
  const { nik, full_name, age, sex, side } = req.body ?? {};
  const ageN = Number(age);
  if (!['P', 'L'].includes(sex) || !['Kanan', 'Kiri'].includes(side) || !Number.isFinite(ageN) || ageN <= 0 || ageN >= 130) {
    return res.status(400).json({ error: 'Data pasien tidak lengkap / tidak valid (usia, kelamin, sisi).' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const pt = await client.query(
      'INSERT INTO patients (nik, full_name, sex, age) VALUES ($1,$2,$3,$4) RETURNING id',
      [nik || null, full_name || null, sex, ageN],
    );
    const { rows: mx } = await client.query(
      `SELECT COALESCE(MAX(SUBSTRING(case_code FROM '[0-9]+$')::int), 91) AS m FROM cases`,
    );
    const code = `KF-2419-${String(Number(mx[0].m) + 1).padStart(4, '0')}`;
    const cs = await client.query(
      `INSERT INTO cases (case_code, patient_id, side, status, note)
       VALUES ($1,$2,$3,'ready','Rekonstruksi selesai · menunggu tinjauan') RETURNING id`,
      [code, pt.rows[0].id, side],
    );
    const caseId = cs.rows[0].id;

    // run ML pipeline (FastAPI service, or stub fallback) and persist I/O
    const p = await runPipeline(code, side);
    const rec = p.reconstruct;
    const files: [string, string, string, number][] = [
      ['nifti', rec.segmentation_file, 'voxel label · 0.5 mm iso · 4.2 MB', 0],
      ['stl', rec.femur_stl, '142k triangle · 2.0 MB', 1],
      ['stl', rec.tibia_stl, '138k triangle · 2.0 MB', 2],
    ];
    for (const [kind, filename, meta, sort] of files) {
      await client.query(
        `INSERT INTO case_files (case_id, kind, filename, meta, sort) VALUES ($1,$2,$3,$4,$5)`,
        [caseId, kind, filename, meta, sort],
      );
    }
    await client.query(
      `INSERT INTO reconstructions (case_id, segmentation_file, confidence, landmarks) VALUES ($1,$2,$3,$4)`,
      [caseId, rec.segmentation_file, rec.confidence, JSON.stringify(rec.landmarks)],
    );
    for (const cand of p.sizing.candidates) {
      await client.query(
        `INSERT INTO implant_candidates (case_id, size, score, note, recommended) VALUES ($1,$2,$3,$4,$5)`,
        [caseId, cand.size, cand.score, cand.note, cand.recommended],
      );
    }
    for (const m of p.fitting) {
      await client.query(
        `INSERT INTO fit_metrics (case_id, size, rmse, coverage_tibia, max_overhang, notching_risk, fit_score)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [caseId, m.size, m.rmse, m.coverage_tibia, m.max_overhang, m.notching_risk, m.fit_score],
      );
    }
    await client.query(
      `INSERT INTO pipeline_runs (case_id, stage, status, finished_at) VALUES ($1,'pipeline',$2, now())`,
      [caseId, p.source],
    );
    await client.query(
      `INSERT INTO case_events (case_id, from_status, to_status, actor) VALUES ($1,NULL,'ready','operator')`,
      [caseId],
    );
    await client.query('COMMIT');
    const { rows } = await query(SELECT + ' WHERE c.case_code = $1', [code]);
    res.status(201).json({ ...rows[0], files: await filesFor(code) });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'Gagal membuat kasus.' });
  } finally {
    client.release();
  }
});

casesRouter.post('/:code/:action', async (req, res) => {
  const { code, action } = req.params;
  const t = TRANSITIONS[action];
  if (!t) return res.status(400).json({ error: 'Aksi tidak dikenal.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const cur = await client.query('SELECT id, status FROM cases WHERE case_code = $1 FOR UPDATE', [code]);
    const row = cur.rows[0];
    if (!row) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Kasus tidak ditemukan.' }); }
    if (!t.from.includes(row.status)) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: `Aksi "${action}" tidak valid dari status "${row.status}".` });
    }
    const note = NOTE_ON[t.to] ?? null;
    const pct = t.to === 'processing' ? 5 : 0;
    await client.query(
      `UPDATE cases SET status = $1, note = $2, progress_stage = $3, progress_pct = $4, updated_at = now() WHERE id = $5`,
      [t.to, note, t.to === 'processing' ? 'Rekonstruksi 3D' : null, pct, row.id],
    );
    await client.query(
      `INSERT INTO case_events (case_id, from_status, to_status, actor) VALUES ($1,$2,$3,'operator')`,
      [row.id, row.status, t.to],
    );
    await client.query('COMMIT');
    const { rows } = await query(SELECT + ' WHERE c.case_code = $1', [code]);
    res.json(rows[0]);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'Gagal memperbarui kasus.' });
  } finally {
    client.release();
  }
});
