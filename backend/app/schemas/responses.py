"""Response schemas shared by the language and frontend teams."""

from typing import Literal

from pydantic import BaseModel, Field


class AutomaticCorrectionResponse(BaseModel):
    """One deterministic word-boundary correction."""

    original: str
    replacement: str


class TranscriptResponse(BaseModel):
    """Draft speech transcript requiring farmer confirmation."""

    language: Literal["mfe", "en"]
    raw_transcript: str
    corrected_transcript: str
    automatic_corrections: list[AutomaticCorrectionResponse]
    requires_confirmation: Literal[True]


class TranslationResponse(BaseModel):
    """Meaning-preserving translation with visible uncertainty."""

    source_language: Literal["mfe", "en"]
    target_language: Literal["mfe", "en"]
    translated_text: str
    uncertain_segments: list[str]


class ShopProductContextResponse(BaseModel):
    """One catalogue-backed recommendation with an honest stock state."""

    id: str
    name: str
    name_mfe: str
    category: str
    active_ingredient: str | None
    supported_crops: list[str]
    supported_problems: list[str]
    stock_status: Literal[
        "in_stock",
        "low_stock",
        "out_of_stock",
        "unknown",
    ]
    usage_notes: str
    warnings: list[str]


class ConversationTurnResponse(BaseModel):
    """One completed text turn; speech can be requested separately."""

    case_id: str
    source_language: Literal["mfe", "en", "fr"]
    confirmed_transcript: str
    meaning_for_analysis_en: str
    reply_text: str
    reply_language: Literal["mfe", "en", "fr"]
    translation_uncertain_segments: list[str]
    shop_products: list[ShopProductContextResponse] = Field(
        default_factory=list
    )
    preliminary_only: Literal[True]


class ImageConversationTurnResponse(ConversationTurnResponse):
    """One preliminary multimodal crop-image conversation turn."""

    visual_observations: list[str]
    possible_risks: list[str]
    missing_information: list[str]
    recommended_actions: list[str]
    urgency: Literal["low", "medium", "high"]
    warnings: list[str]
