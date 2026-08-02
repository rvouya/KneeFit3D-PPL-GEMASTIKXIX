# KneeFit3D

Perencanaan praoperasi Total Knee Arthroplasty (TKA) berbasis AI. Input sepasang
X-ray (AP + Lateral) → rekonstruksi tulang 3D → rekomendasi ukuran implan + skor
kesesuaian. **Alat bantu keputusan, bukan pengganti keputusan dokter.**

## Arsitektur

```
PPL/
├── src/            Frontend  — React + Vite + Tailwind + react-three-fiber
├── server/         Backend   — Node + Express + PostgreSQL (API + DB)
├── ml/             ML service— Python + FastAPI (4-stage pipeline; taruh model di sini)
├── docs/           CONTEXT, USECASE, CARA_JALANKAN
```

Alur data: **web** → **server (Node)** → **ml (FastAPI)**.
Node memanggil ML lewat HTTP; kalau ML mati → fallback stub (web tetap jalan).

## Pipeline ML (isi model kamu — `ml/`)

| Stage | File | Input | Output |
|---|---|---|---|
| Data preprocessing | `ml/pipeline/preprocessing.py` | AP + LAT | normalized, spacing, quality |
| 3D Reconstruction | `ml/pipeline/reconstruction.py` | normalized | segmentation.nii.gz, femur/tibia STL, confidence, landmarks |
| Penentuan Ukuran Implan | `ml/pipeline/implant_sizing.py` | landmarks | kandidat ukuran + skor |
| Virtual Fitting | `ml/pipeline/virtual_fitting.py` | mesh + ukuran | RMSE, coverage, overhang, notching, fit score |

Kontrak I/O di `ml/schemas.py` (Python) & `server/src/ml.ts` (Node) — samakan field-nya.

## Tabel DB untuk I/O model

`case_images` (input) · `reconstructions` · `implant_candidates` · `fit_metrics` ·
`pipeline_runs` (status job) · `case_files` (file output). Skema: `server/schema.sql`.

## Menjalankan

```bash
# 1. Database (sekali)
npm run db:create && npm run db:setup      # butuh PostgreSQL lokal

# 2. Web + API
npm install
npm run dev:all                            # web :5173 · api :4000

# 3. ML service (opsional; tanpa ini pakai stub)
cd ml && python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --port 8000 --reload       # :8000
```

Login: `a.wibowo@rsudhs.go.id` / `password12`.
Detail: [docs/CARA_JALANKAN.md](docs/CARA_JALANKAN.md) · alur & status: [docs/USECASE.md](docs/USECASE.md).
