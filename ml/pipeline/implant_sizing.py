"""Stage 3 — Penentuan Ukuran Implan.

INPUT : SizingRequest (case_code, landmarks)
OUTPUT: SizingResult (candidates[size, score, note, recommended], recommended_size)

TODO (your model):
  - from landmarks/mesh metrics (ML width, AP size, tibial slope)
  - rank implant catalogue -> scores + notes
"""
from schemas import SizingRequest, SizingResult, ImplantCandidate


def size_implant(req: SizingRequest) -> SizingResult:
    # --- STUB ---
    candidates = [
        ImplantCandidate(size="Ukuran B", score=92, note="Direkomendasikan", recommended=True),
        ImplantCandidate(size="Ukuran A", score=78, note="Undercoverage ML 2.8%", recommended=False),
        ImplantCandidate(size="Ukuran C", score=64, note="Overhang medial 3.4 mm", recommended=False),
    ]
    return SizingResult(candidates=candidates, recommended_size="Ukuran B")
