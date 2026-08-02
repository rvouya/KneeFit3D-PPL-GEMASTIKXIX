# Panduan Memasukkan Model (Integration Guide)

Panduan buat kontributor/anggota tim: **taruh file model kamu di mana** dan
**edit file apa** supaya nyambung ke backend. Kamu **tidak perlu** menyentuh
frontend atau database — cukup folder `ml/`.

## 0. Gambaran alur

```
Web (React)  →  Backend (Node/Express, :4000)  →  ML Service (FastAPI, :8000)
                         │                                   │
                    PostgreSQL                        model + bobot kamu
```

Backend memanggil ML lewat HTTP `POST /pipeline`. Kalau ML mati, backend pakai
**stub** (angka dummy) supaya web tetap jalan. Begitu ML service kamu hidup +
model diisi, output asli otomatis dipakai.

## 1. Taruh file kamu di mana

| Yang mau kamu masukkan | Taruh / edit di |
|---|---|
| **Bobot model** (.pt/.pth/.onnx/.h5, dll) | `ml/models/`  *(di-gitignore, tidak ke-commit)* |
| **Kode Data Preprocessing** | `ml/pipeline/preprocessing.py` → fungsi `preprocess()` |
| **Kode 3D Reconstruction** | `ml/pipeline/reconstruction.py` → fungsi `reconstruct()` |
| **Kode Penentuan Ukuran Implan** | `ml/pipeline/implant_sizing.py` → fungsi `size_implant()` |
| **Kode Virtual Fitting** | `ml/pipeline/virtual_fitting.py` → fungsi `virtual_fit()` |
| **Dependency Python** (torch, monai, dll) | `ml/requirements.txt` |

> Jangan ganti **nama fungsi** dan **field return** — backend bergantung pada
> nama itu (didefinisikan di `ml/schemas.py`). Isi bagian `# --- STUB ---` aja.

## 2. Kontrak input/output tiap stage

Semua tipe ada di `ml/schemas.py`. Ringkasnya:

**1. `preprocess(req)`**
- IN : `req.case_code`, `req.side` (`Kanan`/`Kiri`), `req.images` (list AP & LAT; tiap item `path`/`base64`, `mime`)
- OUT: `PreprocessResult(normalized_ref, spacing_mm, quality_ok, notes)`

**2. `reconstruct(req)`**
- IN : `req.case_code`, `req.normalized_ref`
- OUT: `ReconstructResult(segmentation_file, femur_stl, tibia_stl, confidence, landmarks)`
- Nama file **wajib unik & tidak redundan**: `humanfemur-<idpasien>-<rand>.stl`, dst.

**3. `size_implant(req)`**
- IN : `req.case_code`, `req.landmarks`
- OUT: `SizingResult(candidates[ImplantCandidate(size, score, note, recommended)], recommended_size)`

**4. `virtual_fit(req)`**
- IN : `req.case_code`, `req.femur_stl`, `req.tibia_stl`, `req.size`
- OUT: `FitMetrics(size, rmse, coverage_tibia, max_overhang, notching_risk, fit_score)`

## 3. Langkah integrasi

```bash
cd ml
python -m venv .venv
.venv\Scripts\activate            # Windows (Linux/Mac: source .venv/bin/activate)
pip install -r requirements.txt   # tambah dependency model kamu dulu di file ini
```

1. Copy bobot ke `ml/models/`.
2. Buka file stage kamu di `ml/pipeline/`, ganti isi `# --- STUB ---` dengan
   load model + inferensi. Return pakai tipe yang sama.
3. Jalankan service:
   ```bash
   uvicorn app:app --port 8000 --reload
   ```
4. Cek: buka http://localhost:8000/docs (Swagger, bisa test tiap endpoint).

## 4. Sambungkan ke backend

Di `server/.env` sudah ada:
```
ML_SERVICE_URL=http://localhost:8000
```
Selama ML service (:8000) hidup, backend otomatis pakai output model kamu.
Kalau mati → fallback stub. Cek sumber data lewat kolom `status` di tabel
`pipeline_runs` (`ml-service` = model asli, `stub` = dummy).

## 5. Tes end-to-end

```bash
# terminal 1: DB + web + API
npm run dev:all
# terminal 2: ML service
cd ml && uvicorn app:app --port 8000
```
Lalu di web (http://localhost:5173): login → **Kasus baru** → isi form + upload
AP/LAT (.dcm/.png) → **Rekonstruksi 3D**. File output, kandidat ukuran, dan
metrik fitting yang muncul akan berasal dari model kamu.

## 6. Jangan di-commit
`ml/models/` dan semua `.env` sudah masuk `.gitignore`. Jangan push bobot besar
atau kredensial ke GitHub.
