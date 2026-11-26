"""Match farmer-supplied crop names to Mauritius FAREI guide entries."""

import json
import re
import unicodedata
from pathlib import Path


def _normalise(text: str) -> str:
    folded = unicodedata.normalize("NFKD", text.casefold().replace("’", "'"))
    return "".join(c for c in folded if not unicodedata.combining(c))


_entries = json.loads(Path(__file__).with_name("farei_crops.json").read_text("utf-8"))
_by_alias = {
    _normalise(alias): entry for entry in _entries for alias in entry["aliases"]
}
_names = re.compile(
    r"\b(?:" + "|".join(map(re.escape, sorted(_by_alias, key=len, reverse=True))) + r")\b"
)


def latest_crop_reference(message: str, history: tuple[str, ...]) -> dict | None:
    for turn in (message, *reversed(history)):
        reference = crop_reference(turn)
        if reference:
            return reference
    return None


def crop_reference(message: str) -> dict | None:
    match = _names.search(_normalise(message))
    if not match:
        return None
    name = match.group()
    entry = _by_alias[name]
    reference = {"name": name, "source": entry["guide"]}
    if "cycle" in entry:
        reference["crop_cycle_in_french"] = entry["cycle"]
    return reference
