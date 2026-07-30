"""Compatibility entry point for Kavish's crop-image Gemma integration."""

from __future__ import annotations

from functools import lru_cache

from backend.app.config import settings
from backend.app.prompts.translation_prompts import LanguageCode
from backend.app.services.conversation_service import InMemoryConversationStore
from backend.app.services.gemma_client import GoogleGemmaClient
from backend.app.services.image_analysis_service import ImageAnalysisService

_store = InMemoryConversationStore()
_SUPPORTED_IMAGE_TYPES = frozenset(
    {"image/jpeg", "image/png", "image/webp"}
)


@lru_cache(maxsize=1)
def _client() -> GoogleGemmaClient:
    """Reuse the configured hosted client across image turns."""

    return GoogleGemmaClient(
        api_key=settings.gemma_api_key(),
        model_name=settings.GEMMA_MODEL_NAME,
        fallback_model_names=(settings.GEMMA_FALLBACK_MODEL_NAME,),
        maximum_attempts=2,
        maximum_output_tokens=1_024,
        thinking_level="minimal",
    )


def process_chatbot_image_message(
    image_bytes: bytes,
    user_chat_message: str,
    *,
    mime_type: str = "image/jpeg",
    language: LanguageCode = "mfe",
) -> dict:
    """Return safe preliminary observations from an uploaded crop image.

    This replaces the former colour-histogram matcher. Histogram similarity
    cannot verify a disease, and this boundary never prescribes a chemical,
    dosage, product, or guaranteed cure.
    """

    if not image_bytes:
        raise ValueError("image bytes cannot be empty")
    if mime_type not in _SUPPORTED_IMAGE_TYPES:
        raise ValueError("image must be JPEG, PNG, or WebP")

    result = ImageAnalysisService(
        client=_client(),
        store=_store,
    ).respond(
        user_chat_message,
        images=[(image_bytes, mime_type)],
        language=language,
    )
    return {
        "status": "success",
        "case_id": result.case_id,
        "reply_text": result.reply_text,
        "visual_observations": list(result.visual_observations),
        "possible_risks": list(result.possible_risks),
        "missing_information": list(result.missing_information),
        "recommended_actions": list(result.recommended_actions),
        "urgency": result.urgency,
        "warnings": list(result.warnings),
        "preliminary_only": True,
    }
