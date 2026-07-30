"""Filter the real Rekolt Alert catalogue for safe conversation context."""

from __future__ import annotations

import json
import re
import unicodedata
from collections.abc import Mapping, Sequence
from dataclasses import asdict, dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any, Literal

StockStatus = Literal[
    "in_stock",
    "low_stock",
    "out_of_stock",
    "unknown",
]

_CATALOGUE_PATH = (
    Path(__file__).resolve().parents[3]
    / "app"
    / "data"
    / "mauritius-agro-products.json"
)
_PRODUCT_REQUEST_TERMS = {
    "acheter",
    "aste",
    "boutique",
    "buy",
    "catalogue",
    "fungicide",
    "insecticide",
    "magasin",
    "magazin",
    "medcine",
    "medcines",
    "medicine",
    "medicines",
    "meds",
    "pesticide",
    "pestisid",
    "product",
    "products",
    "produit",
    "produits",
    "prodwi",
    "shop",
    "store",
    "treatment",
    "traitement",
    "tretman",
}
_TREATMENT_TERMS = _PRODUCT_REQUEST_TERMS | {
    "malad",
    "pouri",
    "pourri",
    "rotting",
    "spot",
    "spots",
    "tas",
    "tache",
    "taches",
    "trou",
    "yellow",
    "zonn",
}
_GENERIC_QUERY_TERMS = {
    "can",
    "dan",
    "de",
    "des",
    "do",
    "for",
    "from",
    "in",
    "ki",
    "la",
    "le",
    "les",
    "mes",
    "mo",
    "my",
    "our",
    "plant",
    "plants",
    "pour",
    "pou",
    "product",
    "products",
    "produit",
    "produits",
    "prodwi",
    "shop",
    "the",
    "use",
    "utiliser",
    "what",
    "your",
    "zot",
}
_EXCLUDED_RECOMMENDATION_IDS = {
    # These catalogue items need professional confirmation beyond this
    # preliminary assistant's safe recommendation scope.
    "CHEM_011",  # Glyphosate
    "CHEM_020",  # Methomyl
}
_PROBLEM_EXPANSIONS: tuple[tuple[set[str], set[str]], ...] = (
    (
        {"pouri", "pourri", "rot", "rotting"},
        {
            "bactericide",
            "bacterial",
            "bio-fungicide",
            "fungal",
            "fungicide",
            "soil fungi",
        },
    ),
    (
        {"black", "nwar", "spot", "spots", "tas", "tache", "taches"},
        {"bacterial spot", "blight", "fungal", "fungicide"},
    ),
    (
        {"aphid", "aphids", "bebet", "insect", "insects", "pest", "pests"},
        {
            "aphid",
            "aphids",
            "bio-pesticide",
            "insecticide",
            "pest control",
            "whiteflies",
        },
    ),
    (
        {"caterpillar", "caterpillars", "hole", "holes", "trou"},
        {
            "caterpillar",
            "caterpillars",
            "chewing insect",
            "fruit borer",
            "insecticide",
        },
    ),
    (
        {"dry", "sek", "stress", "wilting", "zonn", "yellow"},
        {
            "fertilizer",
            "micronutrient",
            "nutrient",
            "soil conditioning",
            "stress relief",
        },
    ),
    (
        {"tomat", "tomate", "tomates", "tomato", "tomatoes"},
        {"tomato"},
    ),
)


def _fold(value: str) -> str:
    """Return lower-case searchable text without accent sensitivity."""

    normalized = unicodedata.normalize("NFKD", value.casefold())
    return "".join(
        character
        for character in normalized
        if not unicodedata.combining(character)
    )


def _tokens(value: str) -> set[str]:
    return set(re.findall(r"[a-z0-9]+", _fold(value)))


@dataclass(frozen=True)
class ShopProductContext:
    """One real catalogue product safe to expose to Gemma and the UI."""

    id: str
    name: str
    name_mfe: str
    category: str
    active_ingredient: str | None
    supported_crops: tuple[str, ...]
    supported_problems: tuple[str, ...]
    stock_status: StockStatus
    usage_notes: str
    warnings: tuple[str, ...]

    def as_prompt_dict(self) -> dict[str, Any]:
        """Serialize without adding prices, dosage, or guessed stock."""

        return asdict(self)


@lru_cache(maxsize=1)
def _load_catalogue() -> tuple[dict[str, Any], ...]:
    """Load the same JSON file used by the shop page."""

    payload = json.loads(_CATALOGUE_PATH.read_text(encoding="utf-8"))
    if not isinstance(payload, list):
        raise TypeError("shop catalogue must contain a JSON list")
    return tuple(item for item in payload if isinstance(item, dict))


def is_product_request(message: str) -> bool:
    """Detect explicit shop, product, pesticide, or treatment requests."""

    return bool(_tokens(message) & _PRODUCT_REQUEST_TERMS)


class ShopContextService:
    """Rank a small real-catalogue subset before prompting Gemma."""

    def __init__(
        self,
        *,
        inventory: Mapping[str, StockStatus] | None = None,
        catalogue: Sequence[Mapping[str, Any]] | None = None,
    ) -> None:
        self.inventory = dict(inventory or {})
        self.catalogue = tuple(catalogue or _load_catalogue())

    def search(
        self,
        message: str,
        *,
        history: Sequence[str] = (),
        case_context: Mapping[str, Any] | None = None,
        limit: int = 4,
    ) -> tuple[ShopProductContext, ...]:
        """Return only the strongest matching products from the real data."""

        if not is_product_request(message):
            return ()

        context_text = " ".join(
            [
                *history[-6:],
                json.dumps(case_context or {}, ensure_ascii=False),
                message,
            ]
        )
        all_query_tokens = _tokens(context_text)
        query_tokens = all_query_tokens - _GENERIC_QUERY_TERMS
        expanded_terms: set[str] = set()
        for triggers, expansions in _PROBLEM_EXPANSIONS:
            if query_tokens & triggers:
                expanded_terms.update(expansions)
        expanded_tokens = _tokens(" ".join(expanded_terms))
        treatment_query = bool(all_query_tokens & _TREATMENT_TERMS)

        ranked: list[tuple[int, dict[str, Any]]] = []
        for product in self.catalogue:
            if product.get("id") in _EXCLUDED_RECOMMENDATION_IDS:
                continue
            if treatment_query and product.get("category") == "Seeds & Plants":
                continue
            searchable = " ".join(
                str(product.get(field, ""))
                for field in (
                    "english_name",
                    "kreol_name",
                    "category",
                    "subcategory",
                    "description",
                    "usage_purpose",
                )
            )
            product_tokens = _tokens(searchable)
            direct_matches = query_tokens & product_tokens
            expanded_matches = expanded_tokens & product_tokens
            score = len(direct_matches) * 4 + len(expanded_matches) * 2
            if product.get("category") == "Agro-Chemicals & Salts":
                score += 1
            if score > 1:
                ranked.append((score, dict(product)))

        ranked.sort(
            key=lambda item: (
                -item[0],
                str(item[1].get("id", "")),
            )
        )
        return tuple(
            self._to_context(product)
            for _, product in ranked[: max(1, min(limit, 8))]
        )

    def _to_context(self, product: Mapping[str, Any]) -> ShopProductContext:
        """Map source fields without inferring unavailable inventory data."""

        product_id = str(product.get("id", "")).strip()
        purpose = str(product.get("usage_purpose", "")).strip()
        description = str(product.get("description", "")).strip()
        category = str(product.get("subcategory", "")).strip()
        if product.get("category") == "Seeds & Plants":
            options = product.get("purchase_options")
            if isinstance(options, dict):
                notes = [
                    str(option.get("note", "")).strip()
                    for option in options.values()
                    if isinstance(option, dict)
                ]
                description = " ".join(note for note in notes if note)
            purpose = purpose or "Seeds or young plants listed in the shop."

        # The catalogue has no separate active-ingredient field. Leaving it
        # unknown is safer than treating a product name as verified chemistry.
        return ShopProductContext(
            id=product_id,
            name=str(product.get("english_name", "")).strip(),
            name_mfe=str(product.get("kreol_name", "")).strip(),
            category=category,
            active_ingredient=None,
            supported_crops=(),
            supported_problems=(purpose,) if purpose else (),
            stock_status=self.inventory.get(product_id, "unknown"),
            usage_notes=description or purpose,
            warnings=(
                "Confirm the crop problem and follow the product label before use.",
            ),
        )
