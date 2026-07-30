"""Deterministic language safeguards for Morisien transcript handling.

Shihad owns the language rules in this module. The functions do not call an AI
model and do not infer missing agricultural information.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from functools import cache
from typing import Final

from backend.app.prompts.creole_prompts import MORISIEN_GLOSSARY

_TOKEN_PATTERN: Final = re.compile(r"^([^\w]*)([\w'’-]+)([^\w]*)$", re.UNICODE)
_MAX_SEGMENTS: Final = 3
_REVIEWED_ASR_TOKEN_CORRECTIONS: Final = {
    "anbat": "anba",
    "branz": "brans",
    "karoa": "karo",
    "kokom": "konkonm",
    "rasien": "rasinn",
}


def normalize_morisien_generated_text(text: str) -> str:
    """Remove non-standard diacritics from generated Morisien copy."""

    decomposed = unicodedata.normalize("NFKD", text)
    return "".join(
        character
        for character in decomposed
        if unicodedata.category(character) != "Mn"
    )


@dataclass(frozen=True)
class WordBoundaryCorrection:
    """One unambiguous word-boundary correction applied to a transcript."""

    original: str
    replacement: str


def correct_reviewed_morisien_asr_tokens(
    transcript: str,
) -> tuple[str, tuple[WordBoundaryCorrection, ...]]:
    """Correct only exact MMS errors reviewed in the team's recordings."""

    corrected_tokens: list[str] = []
    corrections: list[WordBoundaryCorrection] = []
    for token in transcript.split():
        match = _TOKEN_PATTERN.fullmatch(token)
        if match is None:
            corrected_tokens.append(token)
            continue

        leading, word, trailing = match.groups()
        replacement = _REVIEWED_ASR_TOKEN_CORRECTIONS.get(word.casefold())
        if replacement is None:
            corrected_tokens.append(token)
            continue
        if word[:1].isupper():
            replacement = replacement.capitalize()

        corrected_tokens.append(f"{leading}{replacement}{trailing}")
        corrections.append(
            WordBoundaryCorrection(
                original=word,
                replacement=replacement,
            )
        )

    return " ".join(corrected_tokens), tuple(corrections)


def _single_word_vocabulary() -> frozenset[str]:
    """Return case-folded glossary entries that contain no spaces."""

    return frozenset(
        term.casefold()
        for terms in MORISIEN_GLOSSARY.values()
        for term in terms
        if " " not in term
    )


def _possible_segmentations(
    token: str,
    vocabulary: frozenset[str],
) -> tuple[tuple[str, ...], ...]:
    """Find bounded segmentations of an unknown token into known words."""

    @cache
    def search(remaining: str, segments_left: int) -> tuple[tuple[str, ...], ...]:
        if not remaining:
            return ((),)
        if segments_left == 0:
            return ()

        matches: list[tuple[str, ...]] = []
        for end in range(1, len(remaining) + 1):
            prefix = remaining[:end]
            if prefix not in vocabulary:
                continue
            for suffix_parts in search(remaining[end:], segments_left - 1):
                matches.append((prefix, *suffix_parts))
                if len(matches) > 1:
                    return tuple(matches)

        return tuple(matches)

    return tuple(
        parts
        for parts in search(token, _MAX_SEGMENTS)
        if len(parts) >= 2
    )


def split_unique_morisien_word_boundaries(
    transcript: str,
) -> tuple[str, tuple[WordBoundaryCorrection, ...]]:
    """Split only unknown tokens with one valid Morisien word segmentation.

    The function intentionally leaves ambiguous and unrecognized tokens
    unchanged. This makes the correction auditable and prevents a word bank
    from silently rewriting the farmer's meaning.
    """

    if not transcript.strip():
        return transcript, ()

    vocabulary = _single_word_vocabulary()
    corrected_tokens: list[str] = []
    corrections: list[WordBoundaryCorrection] = []

    for token in transcript.split():
        match = _TOKEN_PATTERN.fullmatch(token)
        if match is None:
            corrected_tokens.append(token)
            continue

        leading, word, trailing = match.groups()
        folded_word = word.casefold()
        if folded_word in vocabulary:
            corrected_tokens.append(token)
            continue

        segmentations = _possible_segmentations(folded_word, vocabulary)
        if len(segmentations) != 1:
            corrected_tokens.append(token)
            continue

        replacement_words = list(segmentations[0])
        if word[:1].isupper():
            replacement_words[0] = replacement_words[0].capitalize()

        replacement = " ".join(replacement_words)
        corrected_tokens.append(f"{leading}{replacement}{trailing}")
        corrections.append(
            WordBoundaryCorrection(
                original=word,
                replacement=replacement,
            )
        )

    return " ".join(corrected_tokens), tuple(corrections)
