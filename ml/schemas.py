"""I/O contracts shared between the Node backend and the ML pipeline.

Every stage has a typed request/response. The Node backend (server/src/ml.ts)
speaks exactly these shapes over HTTP. Fill the stub implementations in
pipeline/*.py with your real models; do NOT change these field names without
updating server/src/ml.ts too.
"""
from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel

Projection = Literal["AP", "LAT"]
Side = Literal["Kanan", "Kiri"]


class ImageInput(BaseModel):
    projection: Projection
    # path on disk OR base64; your preprocessing decides. Keep both optional.
    path: Optional[str] = None
    base64: Optional[str] = None
    mime: Optional[str] = None  # image/dicom | image/png


# --- Stage 1: Data preprocessing ---
class PreprocessRequest(BaseModel):
    case_code: str
    side: Side
    images: list[ImageInput]


class PreprocessResult(BaseModel):
    normalized_ref: str          # id/path of normalized tensor bundle
    spacing_mm: float            # pixel spacing from DICOM
    quality_ok: bool
    notes: list[str] = []


# --- Stage 2: 3D Reconstruction ---
class ReconstructRequest(BaseModel):
    case_code: str
    normalized_ref: str


class ReconstructResult(BaseModel):
    segmentation_file: str       # e.g. segmentation-0092-<rand>.nii.gz
    femur_stl: str               # humanfemur-<idpasien>-<rand>.stl
    tibia_stl: str               # humantibiafibula-<idpasien>-<rand>.stl
    confidence: float
    landmarks: dict              # {mechanical_axis: [...], epicondylar: [...], ...}


# --- Stage 3: Implant sizing (Penentuan Ukuran Implan) ---
class ImplantCandidate(BaseModel):
    size: str                    # "Ukuran B"
    score: int                   # fit score 0-100
    note: str                    # "Direkomendasikan" / "Undercoverage ML 2.8%"
    recommended: bool


class SizingRequest(BaseModel):
    case_code: str
    landmarks: dict


class SizingResult(BaseModel):
    candidates: list[ImplantCandidate]
    recommended_size: str


# --- Stage 4: Virtual Fitting ---
class FitMetrics(BaseModel):
    size: str
    rmse: float                  # mm
    coverage_tibia: float        # %
    max_overhang: float          # mm
    notching_risk: str           # Rendah/Sedang/Tinggi
    fit_score: int


class VirtualFitRequest(BaseModel):
    case_code: str
    femur_stl: str
    tibia_stl: str
    size: str


# --- Full pipeline ---
class PipelineRequest(BaseModel):
    case_code: str
    side: Side
    images: list[ImageInput]


class PipelineResult(BaseModel):
    preprocess: PreprocessResult
    reconstruct: ReconstructResult
    sizing: SizingResult
    fitting: list[FitMetrics]
