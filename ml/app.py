"""KneeFit3D ML service (FastAPI).

Run: uvicorn app:app --port 8000 --reload
The Node backend (server/src/ml.ts) calls these endpoints. If this service is
down, the backend falls back to deterministic stubs so the web app still works.
"""
from fastapi import FastAPI
from schemas import (
    PreprocessRequest, PreprocessResult,
    ReconstructRequest, ReconstructResult,
    SizingRequest, SizingResult,
    VirtualFitRequest, FitMetrics,
    PipelineRequest, PipelineResult,
)
from pipeline.preprocessing import preprocess
from pipeline.reconstruction import reconstruct
from pipeline.implant_sizing import size_implant
from pipeline.virtual_fitting import virtual_fit

app = FastAPI(title="KneeFit3D ML", version="0.1.0")


@app.get("/health")
def health():
    return {"ok": True, "service": "kneefit3d-ml"}


@app.post("/preprocess", response_model=PreprocessResult)
def api_preprocess(req: PreprocessRequest):
    return preprocess(req)


@app.post("/reconstruct", response_model=ReconstructResult)
def api_reconstruct(req: ReconstructRequest):
    return reconstruct(req)


@app.post("/size-implant", response_model=SizingResult)
def api_size(req: SizingRequest):
    return size_implant(req)


@app.post("/virtual-fit", response_model=FitMetrics)
def api_fit(req: VirtualFitRequest):
    return virtual_fit(req)


@app.post("/pipeline", response_model=PipelineResult)
def api_pipeline(req: PipelineRequest):
    """Full chain: preprocess -> reconstruct -> size -> fit(all candidates)."""
    pre = preprocess(PreprocessRequest(case_code=req.case_code, side=req.side, images=req.images))
    rec = reconstruct(ReconstructRequest(case_code=req.case_code, normalized_ref=pre.normalized_ref))
    siz = size_implant(SizingRequest(case_code=req.case_code, landmarks=rec.landmarks))
    fitting = [
        virtual_fit(VirtualFitRequest(
            case_code=req.case_code, femur_stl=rec.femur_stl, tibia_stl=rec.tibia_stl, size=c.size,
        ))
        for c in siz.candidates
    ]
    return PipelineResult(preprocess=pre, reconstruct=rec, sizing=siz, fitting=fitting)
