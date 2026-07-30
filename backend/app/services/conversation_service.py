"""In-memory, turn-by-turn Morisien crop conversation orchestration."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from threading import RLock
from typing import Any
from uuid import uuid4

from backend.app.prompts.conversation_prompts import (
    CONVERSATION_SYSTEM_PROMPT,
    ConversationLanguageCode,
    build_conversation_prompt,
)
from backend.app.services.gemma_client import TextGenerationClient
from backend.app.services.language_service import (
    normalize_morisien_generated_text,
)
from backend.app.services.shop_context_service import (
    ShopContextService,
    ShopProductContext,
    is_product_request,
)

_GREETING_ONLY_PATTERN = re.compile(
    r"^(?:bonzour|bonjour|hello|hi|hey|salut)"
    r"(?:\s+(?:dokter\s+plant|rekolt\s+alert))?[!.?\s]*$",
    re.IGNORECASE,
)
_OBSERVATION_TERMS = {
    "black",
    "blan",
    "broken",
    "dry",
    "fane",
    "fey",
    "hole",
    "insect",
    "malad",
    "nwar",
    "sek",
    "spot",
    "tas",
    "tonbe",
    "trou",
    "water",
    "wet",
    "yellow",
    "zonn",
}
_MORISIEN_LANGUAGE_MARKERS = {
    "bann",
    "ena",
    "fer",
    "fey",
    "inn",
    "kapav",
    "karo",
    "ki",
    "lapli",
    "lor",
    "mo",
    "pe",
    "pouri",
    "zot",
}
_ENGLISH_LANGUAGE_MARKERS = {
    "are",
    "do",
    "help",
    "is",
    "leaves",
    "my",
    "plants",
    "rotting",
    "should",
    "the",
    "tomato",
    "what",
}
_FRENCH_LANGUAGE_MARKERS = {
    "avec",
    "boutique",
    "comment",
    "dans",
    "des",
    "est",
    "feuilles",
    "mes",
    "peux",
    "plantes",
    "pour",
    "produits",
    "puis",
    "quels",
    "sont",
    "tomates",
    "utiliser",
    "votre",
}


def _language_scores(text: str) -> dict[ConversationLanguageCode, int]:
    words = set(re.findall(r"[^\W\d_]+", text.casefold(), re.UNICODE))
    return {
        "mfe": len(words & _MORISIEN_LANGUAGE_MARKERS),
        "en": len(words & _ENGLISH_LANGUAGE_MARKERS),
        "fr": len(words & _FRENCH_LANGUAGE_MARKERS),
    }


def _confident_language(
    text: str,
) -> tuple[ConversationLanguageCode, bool]:
    scores = _language_scores(text)
    ordered = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    language, highest = ordered[0]
    next_highest = ordered[1][1]
    confident = highest >= 2 and highest > next_highest
    return (language if confident else "en"), confident


def infer_supported_language(text: str) -> ConversationLanguageCode:
    """Infer the latest message language, defaulting ambiguous text to English."""

    return _confident_language(text)[0]


def resolve_conversation_language(
    text: str,
    selected_language: ConversationLanguageCode | None,
) -> ConversationLanguageCode:
    """Use the explicit interface language, otherwise infer from the message."""

    if selected_language is not None:
        return selected_language
    return infer_supported_language(text)


def response_matches_language(
    text: str,
    expected_language: ConversationLanguageCode,
) -> bool:
    """Reject confidently wrong-language output before it reaches the UI."""

    detected, confident = _confident_language(text)
    return not confident or detected == expected_language


@dataclass(frozen=True)
class StoredConversationTurn:
    """One confirmed English-meaning turn retained for prompt continuity."""

    farmer_message_en: str
    assistant_reply_en: str
    case_context: dict[str, Any] | None = None


class InMemoryConversationStore:
    """Volatile demo storage that never retains audio or API credentials."""

    def __init__(
        self,
        *,
        maximum_cases: int = 100,
        maximum_turns_per_case: int = 6,
    ) -> None:
        self.maximum_cases = maximum_cases
        self.maximum_turns_per_case = maximum_turns_per_case
        self._cases: dict[str, list[StoredConversationTurn]] = {}
        self._lock = RLock()

    def get_or_create(self, case_id: str | None) -> str:
        """Return a safe existing ID or create a volatile case."""

        normalized = case_id.strip() if case_id else str(uuid4())
        if not normalized or len(normalized) > 64:
            raise ValueError("case_id must contain 1 to 64 characters")

        with self._lock:
            if normalized not in self._cases:
                if len(self._cases) >= self.maximum_cases:
                    oldest_case = next(iter(self._cases))
                    del self._cases[oldest_case]
                self._cases[normalized] = []
        return normalized

    def history(self, case_id: str) -> tuple[StoredConversationTurn, ...]:
        """Return an immutable history snapshot."""

        with self._lock:
            return tuple(self._cases.get(case_id, ()))

    def append(
        self,
        case_id: str,
        turn: StoredConversationTurn,
    ) -> None:
        """Append a turn while keeping only recent bounded context."""

        with self._lock:
            turns = self._cases.setdefault(case_id, [])
            turns.append(turn)
            del turns[:-self.maximum_turns_per_case]


@dataclass(frozen=True)
class ConversationResult:
    """Validated content returned after one confirmed conversation turn."""

    case_id: str
    source_language: ConversationLanguageCode
    confirmed_transcript: str
    meaning_for_analysis_en: str
    reply_text: str
    reply_language: ConversationLanguageCode
    translation_uncertain_segments: tuple[str, ...]
    shop_products: tuple[ShopProductContext, ...] = ()
    preliminary_only: bool = True


class VoiceConversationService:
    """Translate and answer one turn in a single structured Gemma call."""

    def __init__(
        self,
        *,
        client: TextGenerationClient,
        store: InMemoryConversationStore,
        shop_context: ShopContextService | None = None,
    ) -> None:
        self.client = client
        self.store = store
        self.shop_context = shop_context or ShopContextService()

    @staticmethod
    def _parse_response(raw_response: str) -> dict[str, Any]:
        """Extract one JSON object even when Gemma adds harmless wrappers."""

        cleaned = raw_response.strip()
        decoder = json.JSONDecoder()

        def normalize(payload: Any) -> dict[str, Any] | None:
            if isinstance(payload, str):
                try:
                    payload = json.loads(payload)
                except json.JSONDecodeError:
                    return None
            if isinstance(payload, list) and len(payload) == 1:
                payload = payload[0]
            return payload if isinstance(payload, dict) else None

        try:
            direct = normalize(json.loads(cleaned))
        except json.JSONDecodeError:
            direct = None
        if direct is not None:
            return direct

        for index, character in enumerate(cleaned):
            if character not in "[{":
                continue
            try:
                decoded, _ = decoder.raw_decode(cleaned[index:])
            except json.JSONDecodeError:
                continue
            candidate = normalize(decoded)
            if candidate is not None:
                return candidate

        raise RuntimeError(
            "Gemma response could not be read. Please retry."
        )

    @staticmethod
    def _reply_language(
        payload: dict[str, Any],
        requested_language: ConversationLanguageCode,
    ) -> ConversationLanguageCode:
        value = str(payload.get("reply_language", "")).strip().casefold()
        aliases = {
            "mfe": "mfe",
            "morisien": "mfe",
            "kreol": "mfe",
            "creole": "mfe",
            "en": "en",
            "english": "en",
            "fr": "fr",
            "french": "fr",
            "francais": "fr",
            "français": "fr",
        }
        normalized = aliases.get(value, requested_language)
        if normalized != requested_language:
            raise RuntimeError(
                "Gemma conversation reply language did not match the farmer"
            )
        return requested_language

    @staticmethod
    def _recommended_product_ids(
        payload: dict[str, Any],
        candidates: tuple[ShopProductContext, ...],
    ) -> tuple[str, ...]:
        """Accept only model-selected IDs from the filtered real catalogue."""

        raw_ids = payload.get("recommended_product_ids", [])
        if not isinstance(raw_ids, list):
            return ()
        allowed = {product.id for product in candidates}
        return tuple(
            dict.fromkeys(
                str(product_id).strip()
                for product_id in raw_ids
                if str(product_id).strip() in allowed
            )
        )

    @staticmethod
    def _case_context(
        history: tuple[StoredConversationTurn, ...],
    ) -> dict[str, Any]:
        """Return the latest bounded image/case evidence, when present."""

        for turn in reversed(history):
            if turn.case_context:
                return dict(turn.case_context)
        return {}

    @staticmethod
    def _crop_from_context(text: str) -> str | None:
        lowered = text.casefold()
        crop_names = (
            "tomato",
            "tomate",
            "tomat",
            "piment",
            "chilli",
            "pepper",
            "cucumber",
            "concombre",
            "konkonm",
            "potato",
            "pomme de terre",
        )
        return next((crop for crop in crop_names if crop in lowered), None)

    @staticmethod
    def _stock_label(
        product: ShopProductContext,
        language: ConversationLanguageCode,
    ) -> str:
        labels = {
            "en": {
                "in_stock": "in stock",
                "low_stock": "low stock",
                "out_of_stock": "out of stock",
                "unknown": "stock not recorded; confirm availability",
            },
            "fr": {
                "in_stock": "en stock",
                "low_stock": "stock faible",
                "out_of_stock": "en rupture de stock",
                "unknown": "stock non enregistré; confirmez la disponibilité",
            },
            "mfe": {
                "in_stock": "ena an stok",
                "low_stock": "stok pe fini",
                "out_of_stock": "pena an stok",
                "unknown": "stok pa finn anrezistre; konfirm disponibilite",
            },
        }
        return labels[language][product.stock_status]

    @staticmethod
    def _product_reason(
        product: ShopProductContext,
        language: ConversationLanguageCode,
    ) -> str:
        """Describe source catalogue purpose without leaking another language."""

        purpose = " ".join(product.supported_problems).casefold()
        category = product.category.casefold()
        source = f"{category} {purpose}"
        if language == "en":
            return (
                product.supported_problems[0]
                if product.supported_problems
                else product.usage_notes
            )
        if any(term in source for term in ("fung", "mildew", "blight")):
            return (
                "problem fongis mansione dan katalog"
                if language == "mfe"
                else "problèmes fongiques indiqués dans le catalogue"
            )
        if "bacter" in source:
            return (
                "problem bakteri mansione dan katalog"
                if language == "mfe"
                else "problèmes bactériens indiqués dans le catalogue"
            )
        if any(term in source for term in ("insect", "pest", "aphid")):
            return (
                "kontrol bebet mansione dan katalog"
                if language == "mfe"
                else "lutte contre les insectes indiquée dans le catalogue"
            )
        if any(term in source for term in ("nutrient", "fertilizer", "soil")):
            return (
                "nitrision ouswa later mansione dan katalog"
                if language == "mfe"
                else "nutrition ou sol indiqués dans le catalogue"
            )
        return (
            "lizaz mansione dan katalog"
            if language == "mfe"
            else "usage indiqué dans le catalogue"
        )

    @classmethod
    def _render_product_reply(
        cls,
        *,
        language: ConversationLanguageCode,
        products: tuple[ShopProductContext, ...],
    ) -> str:
        """Build a truthful product paragraph from validated catalogue rows."""

        if not products:
            if language == "mfe":
                return (
                    "Koumans par retir bann parti bien afekte ek evit met enn "
                    "tretman avan konfirm problem-la. Mo pa finn trouv enn "
                    "prodwi adapte dan nou katalog aster. Azout kategori "
                    "apropriye apre verifikasion, ouswa demann enn ofiser "
                    "agrikol konfirm tretman avan aste."
                )
            if language == "fr":
                return (
                    "Commencez par retirer les parties très atteintes et "
                    "n'appliquez pas de traitement avant de confirmer le "
                    "problème. Je n'ai trouvé aucun produit adapté dans notre "
                    "catalogue actuel. Ajoutez une catégorie appropriée après "
                    "vérification ou demandez confirmation à un agent agricole."
                )
            return (
                "Start by removing badly affected material and avoid applying "
                "a treatment until the problem is checked. I could not find a "
                "suitable product in our current shop catalogue. Add an "
                "appropriate category after verification, or ask an "
                "agricultural officer to confirm the treatment before buying."
            )

        product_lines = []
        for product in products:
            display_name = (
                product.name_mfe
                if language == "mfe" and product.name_mfe
                else product.name
            )
            purpose = cls._product_reason(product, language)
            product_lines.append(
                f"{display_name} [{product.id}] — {purpose} "
                f"({cls._stock_label(product, language)})"
            )
        joined = "; ".join(product_lines)
        if language == "mfe":
            return (
                "Koumans par retir bann parti bien afekte ek evit aroz depi "
                f"lao. Dan nou katalog, sa bann prodwi-la kapav konserne: "
                f"{joined}. Sa pa konfirm enn diagnostic. Konfirm problem-la "
                "ek swiv etiket prodwi avan servi li; pa devinn dozaz."
            )
        if language == "fr":
            return (
                "Commencez par retirer les parties très atteintes et évitez "
                f"l'arrosage par le haut. Notre catalogue contient: {joined}. "
                "Cela ne confirme pas un diagnostic. Confirmez le problème et "
                "suivez l'étiquette officielle avant utilisation; ne devinez "
                "jamais le dosage."
            )
        return (
            "Start by removing badly affected material and avoid overhead "
            f"watering. Our catalogue contains these possible matches: "
            f"{joined}. This does not confirm a diagnosis. Confirm the problem "
            "and follow the official product label before use; never guess a "
            "dosage."
        )

    @staticmethod
    def _required_text(payload: dict[str, Any], key: str) -> str:
        value = payload.get(key)
        if not isinstance(value, str) or not value.strip():
            raise RuntimeError(
                f"Gemma conversation response is missing {key}"
            )
        return value.strip()

    def respond(
        self,
        confirmed_transcript: str,
        *,
        language: ConversationLanguageCode,
        case_id: str | None = None,
    ) -> ConversationResult:
        """Process a farmer-confirmed transcript without retaining audio."""

        cleaned = confirmed_transcript.strip()
        if not cleaned:
            raise ValueError("confirmed transcript cannot be empty")

        resolved_case_id = self.store.get_or_create(case_id)
        if _GREETING_ONLY_PATTERN.fullmatch(cleaned):
            reply_text = {
                "mfe": "Bonzour! Ki plant ou pe pouse?",
                "en": "Hello! Which crop are you growing?",
                "fr": "Bonjour ! Quelle culture faites-vous pousser ?",
            }[language]
            self.store.append(
                resolved_case_id,
                StoredConversationTurn(
                    farmer_message_en="Hello.",
                    assistant_reply_en=(
                        "Hello! Which crop are you growing?"
                    ),
                ),
            )
            return ConversationResult(
                case_id=resolved_case_id,
                source_language=language,
                confirmed_transcript=cleaned,
                meaning_for_analysis_en="Hello.",
                reply_text=reply_text,
                reply_language=language,
                translation_uncertain_segments=(),
            )

        words = set(re.findall(r"[a-zA-Z]+", cleaned.casefold()))
        asks_for_general_help = (
            bool(words & {"help", "problem"})
            and bool(words & {"plant", "plants", "plantasion"})
            and not bool(words & _OBSERVATION_TERMS)
        )
        if asks_for_general_help:
            farmer_message_en = (
                "I have a problem with my tomato plants. What can I do?"
                if language == "mfe"
                else cleaned
            )
            if language == "mfe":
                reply_text = (
                    "Mo la pou ed ou. Dir mwa ki sanzman ou trouve lor "
                    "plant-la, ouswa avoy enn foto."
                )
            elif language == "fr":
                reply_text = (
                    "Je peux vous aider. Décrivez les changements sur la "
                    "plante ou envoyez une photo claire."
                )
            else:
                reply_text = (
                    "I can help. Tell me what changed on the plant, or send "
                    "a clear photo."
                )
            self.store.append(
                resolved_case_id,
                StoredConversationTurn(
                    farmer_message_en=farmer_message_en,
                    assistant_reply_en=(
                        "I can help. Tell me what changed on the plant, or "
                        "send a clear photo."
                    ),
                ),
            )
            return ConversationResult(
                case_id=resolved_case_id,
                source_language=language,
                confirmed_transcript=cleaned,
                meaning_for_analysis_en=farmer_message_en,
                reply_text=reply_text,
                reply_language=language,
                translation_uncertain_segments=(),
            )

        stored_history = self.store.history(resolved_case_id)
        history_pairs = tuple(
            (
                turn.farmer_message_en,
                turn.assistant_reply_en,
            )
            for turn in stored_history
        )
        farmer_history_text = tuple(
            turn.farmer_message_en for turn in stored_history
        )
        case_context = self._case_context(stored_history)
        shop_candidates = self.shop_context.search(
            cleaned,
            history=farmer_history_text,
            case_context=case_context,
        )
        context = {
            "conversation_history": [
                {
                    "farmer_message_en": farmer,
                    "assistant_reply_en": assistant,
                }
                for farmer, assistant in history_pairs
            ],
            "current_case": case_context,
            "crop": self._crop_from_context(
                " ".join([*farmer_history_text, cleaned])
            ),
            "observations": case_context.get("visual_observations", []),
            "possible_risks": case_context.get("possible_risks", []),
            "weather_context": case_context.get("weather_context", {}),
            "available_shop_products": [
                product.as_prompt_dict() for product in shop_candidates
            ],
        }

        def generate_payload(*, strict_retry: bool) -> dict[str, Any]:
            prompt = build_conversation_prompt(
                cleaned,
                language=language,
                history=history_pairs,
                context=context,
                strict_language_retry=strict_retry,
            )
            return self._parse_response(
                self.client.generate_text(
                    system_instruction=CONVERSATION_SYSTEM_PROMPT,
                    prompt=prompt,
                    json_output=True,
                )
            )

        payload = generate_payload(strict_retry=False)
        assistant_reply_en = self._required_text(
            payload,
            "assistant_reply_en",
        )
        model_reply_text = (
            assistant_reply_en
            if language == "en"
            else self._required_text(payload, "reply_text")
        )

        model_language_ok = True
        try:
            self._reply_language(payload, language)
        except RuntimeError:
            model_language_ok = False
        if not response_matches_language(model_reply_text, language):
            model_language_ok = False

        product_request = is_product_request(cleaned)
        if not model_language_ok and not product_request:
            payload = generate_payload(strict_retry=True)
            assistant_reply_en = self._required_text(
                payload,
                "assistant_reply_en",
            )
            model_reply_text = (
                assistant_reply_en
                if language == "en"
                else self._required_text(payload, "reply_text")
            )
            self._reply_language(payload, language)
            if not response_matches_language(model_reply_text, language):
                model_reply_text = {
                    "en": (
                        "I could not generate a reliable English reply. "
                        "Please try again."
                    ),
                    "fr": (
                        "Je n'ai pas pu générer une réponse fiable en "
                        "français. Veuillez réessayer."
                    ),
                    "mfe": (
                        "Mo pa finn kapav prepar enn repons Morisien ki "
                        "fiab. Reeseye."
                    ),
                }[language]

        selected_products: tuple[ShopProductContext, ...] = ()
        if product_request:
            recommended_ids = self._recommended_product_ids(
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
            reply_text = self._render_product_reply(
                language=language,
                products=selected_products,
            )
        else:
            reply_text = model_reply_text

        if language == "mfe":
            reply_text = normalize_morisien_generated_text(reply_text)
        farmer_message_en = str(
            payload.get("meaning_for_analysis_en") or cleaned
        ).strip()
        uncertain = payload.get("uncertain_segments", [])
        if not isinstance(uncertain, list) or not all(
            isinstance(item, str) for item in uncertain
        ):
            raise RuntimeError(
                "Gemma conversation uncertainty must be a string list"
            )
        translation_uncertainty = tuple(
            dict.fromkeys(
                item.strip() for item in uncertain if item.strip()
            )
        )

        self.store.append(
            resolved_case_id,
            StoredConversationTurn(
                farmer_message_en=farmer_message_en,
                assistant_reply_en=assistant_reply_en,
            ),
        )
        return ConversationResult(
            case_id=resolved_case_id,
            source_language=language,
            confirmed_transcript=cleaned,
            meaning_for_analysis_en=farmer_message_en,
            reply_text=reply_text,
            reply_language=language,
            translation_uncertain_segments=translation_uncertainty,
            shop_products=selected_products,
        )
