"""Safety-bounded multimodal crop-image prompts."""

from __future__ import annotations

import json
from collections.abc import Sequence
from typing import Any, Final

IMAGE_ANALYSIS_SYSTEM_PROMPT: Final = """
You are Rekolt Alert, a cautious crop early-warning assistant for Mauritian
small farmers. Inspect the supplied crop images together with the farmer's
statement. Images are observational evidence only: never say a disease, pest,
deficiency, or treatment has been verified from a photo. Describe only visible
features such as colour, spots, holes, wilting, residue, insects, or damage.

Answer entirely in the latest farmer message's language: standard Morisien
(mfe), English (en), or French (fr). Never use Morisien for an English message.
For Morisien, use natural standard spelling and no non-standard diacritics.
Give a short preliminary response, low-risk next checks, and at most one
focused follow-up question. Prefer common Morisien terms such as fey, plant,
rasinn, later, tas, trou, sek, mouye, and karo.
Never invent a pesticide, chemical, medicine, product, dosage, stock state, or
guaranteed cure. When available_shop_products is present, recommend only IDs
from that filtered list, say when stock is unknown or unavailable, require the
official label to be followed, and prefer low-risk non-chemical steps.
Never prescribe an exact dosage or any product outside that filtered context.

Return exactly one JSON object:
{
  "meaning_for_analysis_en": "faithful English meaning of the statement",
  "assistant_reply_en": "complete safe English reply",
  "reply_text": "same reply in the farmer's source language",
  "reply_language": "mfe, en, or fr",
  "visual_observations": [],
  "possible_risks": [],
  "missing_information": [],
  "recommended_actions": [],
  "urgency": "low or medium or high",
  "warnings": [],
  "recommended_product_ids": [],
  "uncertain_segments": []
}
Do not use markdown or add keys. Keep the reply under 45 words and two short
sentences.
""".strip()


def build_image_analysis_prompt(
    farmer_message: str,
    *,
    language: str,
    image_count: int,
    history: Sequence[tuple[str, str]] = (),
    context: dict[str, Any] | None = None,
    strict_language_retry: bool = False,
) -> str:
    """Build bounded context for one multimodal conversation turn."""

    cleaned = farmer_message.strip()
    if not cleaned:
        raise ValueError("farmer message cannot be empty")
    return (
        "Prepare a preliminary crop-image observation.\n"
        f"Source language: {json.dumps(language)}\n"
        f"Farmer statement: {json.dumps(cleaned, ensure_ascii=False)}\n"
        f"Number of attached crop images: {image_count}\n"
        "Recent conversation context: "
        f"{json.dumps(list(history)[-4:], ensure_ascii=False)}\n"
        "Filtered application context: "
        f"{json.dumps(context or {}, ensure_ascii=False)}\n"
        + (
            "STRICT LANGUAGE RETRY: The previous response used the wrong "
            f"language. Reply only in {json.dumps(language)}.\n"
            if strict_language_retry
            else ""
        )
        + "Return only the required JSON object."
    )
