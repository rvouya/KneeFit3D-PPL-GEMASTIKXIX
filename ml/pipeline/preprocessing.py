"""Stage 1 — Data preprocessing.

INPUT : PreprocessRequest (case_code, side, images[AP, LAT])
OUTPUT: PreprocessResult (normalized_ref, spacing_mm, quality_ok, notes)

TODO (your model):
  - read DICOM/PNG (pydicom / PIL), extract pixel spacing
  - normalize intensity, resample, register AP+LAT
  - persist normalized tensor bundle; return its ref/path
Replace the stub body below. Keep the return type.
"""
from schemas import PreprocessRequest, PreprocessResult


def preprocess(req: PreprocessRequest) -> PreprocessResult:
    # --- STUB (deterministic) ---
    have = {img.projection for img in req.images}
    ok = {"AP", "LAT"}.issubset(have)
    return PreprocessResult(
        normalized_ref=f"norm-{req.case_code}",
        spacing_mm=0.143,
        quality_ok=ok,
        notes=[] if ok else ["Butuh proyeksi AP dan LAT"],
    )
