"""Preliminary multimodal crop-image conversation service."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

from backend.app.prompts.conversation_prompts import ConversationLanguageCode
from backend.app.prompts.image_prompts import (
    IMAGE_ANALYSIS_SYSTEM_PROMPT,
    build_image_analysis_prompt,
)
from backend.app.services.conversation_service import (
    InMemoryConversationStore,
    StoredConversationTurn,
    VoiceConversationService,
    response_matches_language,
)
from backend.app.services.language_service import (
    normalize_morisien_generated_text,
)
from backend.app.services.shop_context_service import (
    ShopContextService,
    ShopProductContext,
    is_product_request,
)


class MultimodalGenerationClient(Protocol):
    """Provider boundary required by the image service."""

    def generate_multimodal_text(
        self,
        *,
        system_instruction: str,
        prompt: str,
        images: list[tuple[bytes, str]],
        json_output: bool = False,
    ) -> str:
        """Generate structured text from validated image bytes."""


@dataclass(frozen=True)
class ImageConversationResult:
    """Validated preliminary result returned to the farmer UI."""

    case_id: str
    source_language: ConversationLanguageCode
    confirmed_transcript: str
    meaning_for_analysis_en: str
    reply_text: str
    reply_language: ConversationLanguageCode
    visual_observations: tuple[str, ...]
    possible_risks: tuple[str, ...]
    missing_information: tuple[str, ...]
    recommended_actions: tuple[str, ...]
    urgency: str
    warnings: tuple[str, ...]
    translation_uncertain_segments: tuple[str, ...]
    shop_products: tuple[ShopProductContext, ...] = ()
    preliminary_only: bool = True


def _string_list(payload: dict[str, Any], key: str) -> tuple[str, ...]:
    value = payload.get(key, [])
    if isinstance(value, str):
        value = [value]
    if not isinstance(value, list) or not all(
        isinstance(item, str) for item in value
    ):
        raise RuntimeError(f"Gemma image response has invalid {key}")
    return tuple(dict.fromkeys(item.strip() for item in value if item.strip()))


class ImageAnalysisService:
    """Analyse visible crop features without claiming a diagnosis."""

    def __init__(
        self,
        *,
        client: MultimodalGenerationClient,
        store: InMemoryConversationStore,
        shop_context: ShopContextService | None = None,
    ) -> None:
        self.client = client
        self.store = store
        self.shop_context = shop_context or ShopContextService()

    def respond(
        self,
        confirmed_transcript: str,
        *,
        images: list[tuple[bytes, str]],
        language: ConversationLanguageCode,
        case_id: str | None = None,
    ) -> ImageConversationResult:
        """Return a safe image-assisted conversation turn."""

        if not 1 <= len(images) <= 3:
            raise ValueError("attach between one and three crop images")
        cleaned = confirmed_transcript.strip()
        if not cleaned:
            raise ValueError("confirmed transcript cannot be empty")

        resolved_case_id = self.store.get_or_create(case_id)
        history = self.store.history(resolved_case_id)
        history_pairs = tuple(
            (
                turn.farmer_message_en,
                turn.assistant_reply_en,
            )
            for turn in history
        )
        farmer_history_text = tuple(
            turn.farmer_message_en for turn in history
        )
        previous_case_context = VoiceConversationService._case_context(history)
        shop_candidates = self.shop_context.search(
            cleaned,
            history=farmer_history_text,
            case_context=previous_case_context,
        )
        prompt_context = {
            "conversation_history": [
                {
                    "farmer_message_en": farmer,
                    "assistant_reply_en": assistant,
                }
                for farmer, assistant in history_pairs
            ],
            "current_case": previous_case_context,
            "crop": VoiceConversationService._crop_from_context(
                " ".join([*farmer_history_text, cleaned])
            ),
            "weather_context": previous_case_context.get(
                "weather_context",
                {},
            ),
            "available_shop_products": [
                product.as_prompt_dict() for product in shop_candidates
            ],
        }

        def generate_payload(*, strict_retry: bool) -> dict[str, Any]:
            raw_response = self.client.generate_multimodal_text(
                system_instruction=IMAGE_ANALYSIS_SYSTEM_PROMPT,
                prompt=build_image_analysis_prompt(
                    cleaned,
                    language=language,
                    image_count=len(images),
                    history=history_pairs,
                    context=prompt_context,
                    strict_language_retry=strict_retry,
                ),
                images=images,
                json_output=True,
            )
            return VoiceConversationService._parse_response(raw_response)

        payload = generate_payload(strict_retry=False)
        model_reply_text = VoiceConversationService._required_text(
            payload,
            "reply_text",
        )
        assistant_reply_en = VoiceConversationService._required_text(
            payload,
            "assistant_reply_en",
        )
        reply_text = (
            assistant_reply_en if language == "en" else model_reply_text
        )
        language_ok = True
        try:
            VoiceConversationService._reply_language(payload, language)
        except RuntimeError:
            language_ok = False
        if not response_matches_language(reply_text, language):
            language_ok = False
        product_request = is_product_request(cleaned)
        if not language_ok and not product_request:
            payload = generate_payload(strict_retry=True)
            model_reply_text = VoiceConversationService._required_text(
                payload,
                "reply_text",
            )
            assistant_reply_en = VoiceConversationService._required_text(
                payload,
                "assistant_reply_en",
            )
            reply_text = (
                assistant_reply_en if language == "en" else model_reply_text
            )
            VoiceConversationService._reply_language(payload, language)
            if not response_matches_language(reply_text, language):
                raise RuntimeError(
                    "Gemma image reply language did not match the farmer"
                )
        selected_products: tuple[ShopProductContext, ...] = ()
        if product_request:
            recommended_ids = VoiceConversationService._recommended_product_ids(
                payload,
                shop_candidates,
            )
            selected_products = tuple(
                product
                for product in shop_candidates
                if product.id in recommended_ids
            )
            if not selected_products and shop_candidates:
                selected_products = shop_candidates[:2]
            reply_text = VoiceConversationService._render_product_reply(
                language=language,
                products=selected_products,
            )
        if language == "mfe":
            reply_text = normalize_morisien_generated_text(reply_text)
        farmer_message_en = str(
            payload.get("meaning_for_analysis_en") or cleaned
        ).strip()
        urgency = str(payload.get("urgency", "medium")).casefold()
        if urgency == "moderate":
            urgency = "medium"
        if urgency not in {"low", "medium", "high"}:
            urgency = "medium"

        visual_observations = _string_list(
            payload,
            "visual_observations",
        )
        possible_risks = _string_list(payload, "possible_risks")
        missing_information = _string_list(
            payload,
            "missing_information",
        )
        recommended_actions = _string_list(
            payload,
            "recommended_actions",
        )
        warnings = _string_list(payload, "warnings")

        self.store.append(
            resolved_case_id,
            StoredConversationTurn(
                farmer_message_en=farmer_message_en,
                assistant_reply_en=assistant_reply_en,
                case_context={
                    "visual_observations": list(visual_observations),
                    "possible_risks": list(possible_risks),
                    "missing_information": list(missing_information),
                    "recommended_actions": list(recommended_actions),
                    "weather_context": {},
                },
            ),
        )
        return ImageConversationResult(
            case_id=resolved_case_id,
            source_language=language,
            confirmed_transcript=cleaned,
            meaning_for_analysis_en=farmer_message_en,
            reply_text=reply_text,
            reply_language=language,
            visual_observations=visual_observations,
            possible_risks=possible_risks,
            missing_information=missing_information,
            recommended_actions=recommended_actions,
            urgency=urgency,
            warnings=warnings,
            translation_uncertain_segments=_string_list(
                payload,
                "uncertain_segments",
            ),
            shop_products=selected_products,
        )
