"""Disabled prototype for Kaggle image-histogram matching.

The live Rekolt Alert photo path uses Gemma vision with the farmer's statement.
HSV colour correlation cannot safely identify a crop condition and scanning an
entire downloaded dataset on every request would make the application slow.
"""

from __future__ import annotations

from typing import Any


class LightweightDiseaseMatcher:
    """Preserve Kavish's old boundary without claiming a dataset diagnosis."""

    def find_matching_condition(
        self,
        uploaded_img_bytes: bytes,
    ) -> dict[str, Any]:
        """Return an explicit non-result for the retired matcher."""

        if not uploaded_img_bytes:
            return {
                "status": "error",
                "message": "Image bytes cannot be empty.",
            }
        return {
            "status": "disabled",
            "message": (
                "Kaggle histogram matching is not used. "
                "Use the preliminary multimodal image service."
            ),
            "confidence": 0,
        }
