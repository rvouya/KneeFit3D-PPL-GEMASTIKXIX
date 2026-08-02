"""Stage 4 — Training / inference Virtual Fitting.

INPUT : VirtualFitRequest (case_code, femur_stl, tibia_stl, size)
OUTPUT: FitMetrics (rmse, coverage_tibia, max_overhang, notching_risk, fit_score)

TODO (your model):
  - overlay implant of `size` onto bone mesh
  - compute RMSE, tibial coverage, max over/under-hang, notching risk
"""
from schemas import VirtualFitRequest, FitMetrics


def virtual_fit(req: VirtualFitRequest) -> FitMetrics:
    # --- STUB ---
    return FitMetrics(
        size=req.size,
        rmse=0.82,
        coverage_tibia=96.9,
        max_overhang=1.6,
        notching_risk="Rendah",
        fit_score=92,
    )
