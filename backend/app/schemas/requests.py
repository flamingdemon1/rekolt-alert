"""Validated request schemas for language and voice-conversation routes."""

from typing import Literal

from pydantic import BaseModel, Field

LanguageCode = Literal["mfe", "en"]
ConversationLanguageCode = Literal["mfe", "en", "fr"]


class TranslationRequest(BaseModel):
    """Translate farmer-confirmed text between Morisien and English."""

    source_text: str = Field(min_length=1, max_length=4_000)
    source_language: LanguageCode
    target_language: LanguageCode
    source_confirmed: bool = False


class SpeechRequest(BaseModel):
    """Generate Morisien speech for a bounded farmer-facing response."""

    text: str = Field(min_length=1, max_length=2_000)


class ConversationTurnRequest(BaseModel):
    """Submit one confirmed text turn to the conversational assistant."""

    case_id: str | None = Field(default=None, max_length=64)
    confirmed_transcript: str = Field(min_length=1, max_length=2_000)
    language: ConversationLanguageCode | None = None


class ImageContentRequest(BaseModel):
    """One inline crop image supplied to hosted multimodal Gemma."""

    filename: str = Field(min_length=1, max_length=255)
    mime_type: Literal["image/jpeg", "image/png", "image/webp"]
    data_base64: str = Field(min_length=1, max_length=15_000_000)


class ImageConversationTurnRequest(ConversationTurnRequest):
    """Submit one confirmed turn with up to three crop images."""

    images: list[ImageContentRequest] = Field(min_length=1, max_length=3)
