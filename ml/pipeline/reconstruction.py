"""Stage 2 — Training / inference 3D Reconstruction.

INPUT : ReconstructRequest (case_code, normalized_ref)
OUTPUT: ReconstructResult (segmentation_file, femur_stl, tibia_stl, confidence, landmarks)

File names MUST be random & non-redundant per case:
  humanfemur-<idpasien>-<rand>.stl , humantibiafibula-<idpasien>-<rand>.stl

TODO (your model):
  - run diffusion/segmentation net -> voxel labels -> marching cubes -> STL
  - detect anatomical landmarks
  - write files to a served location; return their names
"""
import secrets
from schemas import ReconstructRequest, ReconstructResult


def _digits(code: str) -> str:
    d = "".join(ch for ch in code if ch.isdigit())
    return d[-4:] if d else "0000"


def reconstruct(req: ReconstructRequest) -> ReconstructResult:
    d = _digits(req.case_code)
    r = lambda: secrets.token_hex(4)
    # --- STUB (deterministic-ish) ---
    return ReconstructResult(
        segmentation_file=f"segmentation-{d}-{r()}.nii.gz",
        femur_stl=f"humanfemur-{d}-{r()}.stl",
        tibia_stl=f"humantibiafibula-{d}-{r()}.stl",
        confidence=0.94,
        landmarks={
            "mechanical_axis": [[0, 0, 0], [0, -1, 0]],
            "epicondylar": [[-0.4, 0, 0], [0.4, 0, 0]],
            "tibial_plateau": [[0, -0.6, 0]],
        },
    )
