# KneeFit3D — ML Service

FastAPI service holding the 4-stage reconstruction/fitting pipeline. The Node
backend calls it over HTTP; if it is offline the backend falls back to stubs so
the web app keeps working.

## Pipeline (isi model kamu di sini)

| Stage | File | Input | Output |
|---|---|---|---|
| 1. Data preprocessing | `pipeline/preprocessing.py` | AP + LAT image | normalized ref, spacing, quality |
| 2. 3D Reconstruction | `pipeline/reconstruction.py` | normalized ref | segmentation.nii.gz, femur/tibia STL, confidence, landmarks |
| 3. Penentuan Ukuran Implan | `pipeline/implant_sizing.py` | landmarks | candidate sizes + scores |
| 4. Virtual Fitting | `pipeline/virtual_fitting.py` | mesh + size | RMSE, coverage, overhang, notching, fit score |

Each file has a stub returning deterministic values. Replace the stub body with
your model; keep the return types (defined in `schemas.py`) unchanged — the Node
backend depends on those exact field names.

Drop model weights in `ml/models/` (gitignored).

## Run
```
python -m venv .venv && .venv\Scripts\activate      # Windows
pip install -r requirements.txt
uvicorn app:app --port 8000 --reload
```
Health check: http://localhost:8000/health · Docs: http://localhost:8000/docs

## Contract
Backend expects `POST /pipeline` with `{case_code, side, images:[{projection,path|base64,mime}]}`
and gets back `{preprocess, reconstruct, sizing, fitting}` (see `schemas.py`).
Set `ML_SERVICE_URL=http://localhost:8000` in `server/.env` to connect.
