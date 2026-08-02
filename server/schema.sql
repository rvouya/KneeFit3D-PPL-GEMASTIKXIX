-- KneeFit3D schema
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  org           TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
  CREATE TYPE case_status AS ENUM
    ('queued','processing','ready','reviewed','error','canceled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS patients (
  id        SERIAL PRIMARY KEY,
  nik       TEXT,
  full_name TEXT,
  sex       CHAR(1) NOT NULL CHECK (sex IN ('P','L')),
  age       INT NOT NULL CHECK (age > 0 AND age < 130)
);

CREATE TABLE IF NOT EXISTS cases (
  id             SERIAL PRIMARY KEY,
  case_code      TEXT UNIQUE NOT NULL,
  patient_id     INT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  side           TEXT NOT NULL CHECK (side IN ('Kanan','Kiri')),
  status         case_status NOT NULL DEFAULT 'queued',
  progress_stage TEXT,
  progress_pct   INT NOT NULL DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  note           TEXT,
  uploaded_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- generated reconstruction output files (unique names, non-redundant)
CREATE TABLE IF NOT EXISTS case_files (
  id         SERIAL PRIMARY KEY,
  case_id    INT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL,        -- 'nifti' | 'stl'
  filename   TEXT UNIQUE NOT NULL,
  meta       TEXT NOT NULL,        -- e.g. "142k triangle · 2.0 MB"
  sort       INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS case_events (
  id          SERIAL PRIMARY KEY,
  case_id     INT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  from_status case_status,
  to_status   case_status NOT NULL,
  actor       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_uploaded ON cases(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_files_case ON case_files(case_id);

-- migrations for existing installs
ALTER TABLE patients ADD COLUMN IF NOT EXISTS nik TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS full_name TEXT;

-- ===== ML pipeline I/O tables =====
CREATE TABLE IF NOT EXISTS case_images (          -- stage 1 input
  id         SERIAL PRIMARY KEY,
  case_id    INT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  projection TEXT NOT NULL CHECK (projection IN ('AP','LAT')),
  filename   TEXT NOT NULL,
  mime       TEXT,
  spacing_mm NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reconstructions (      -- stage 2 output
  id                SERIAL PRIMARY KEY,
  case_id           INT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  segmentation_file TEXT,
  confidence        NUMERIC,
  landmarks         JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS implant_candidates (   -- stage 3 output
  id          SERIAL PRIMARY KEY,
  case_id     INT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  size        TEXT NOT NULL,
  score       INT NOT NULL,
  note        TEXT,
  recommended BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fit_metrics (          -- stage 4 output
  id             SERIAL PRIMARY KEY,
  case_id        INT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  size           TEXT NOT NULL,
  rmse           NUMERIC,
  coverage_tibia NUMERIC,
  max_overhang   NUMERIC,
  notching_risk  TEXT,
  fit_score      INT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pipeline_runs (        -- job tracking
  id          SERIAL PRIMARY KEY,
  case_id     INT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  stage       TEXT NOT NULL,
  status      TEXT NOT NULL,
  error       TEXT,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_candidates_case ON implant_candidates(case_id);
CREATE INDEX IF NOT EXISTS idx_metrics_case ON fit_metrics(case_id);
