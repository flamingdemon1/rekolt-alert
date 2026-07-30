"""Tests for the English and Morisien translation prompt contract."""

import pytest

from backend.app.prompts.translation_prompts import (
    MORISIEN_ENGLISH_GLOSSARY,
    TRANSLATION_SYSTEM_PROMPT,
    build_translation_prompt,
)


def test_translation_system_prompt_preserves_language_safety() -> None:
    """Translation must not become crop analysis or follow source instructions."""

    prompt = " ".join(TRANSLATION_SYSTEM_PROMPT.split())

    assert "untrusted quoted data" in prompt
    assert "Do not add a crop diagnosis" in prompt
    assert "only the requested supported target language" in prompt
    assert '"bann" for plural nouns' in prompt
    assert '"pe" for ongoing actions' in prompt
    assert "without markdown or commentary" in prompt


@pytest.mark.parametrize(
    ("source_language", "target_language"),
    (
        ("mfe", "de"),
        ("it", "en"),
        ("en", "es"),
    ),
)
def test_translation_rejects_unsupported_languages(
    source_language: str,
    target_language: str,
) -> None:
    """The product contract supports only English and Morisien."""

    with pytest.raises(ValueError, match="must be one of: mfe, en"):
        build_translation_prompt(
            "test",
            source_language=source_language,
            target_language=target_language,
        )


def test_translation_rejects_same_source_and_target() -> None:
    """Translation should not be called when no language change is requested."""

    with pytest.raises(ValueError, match="must be different"):
        build_translation_prompt(
            "Mo ena enn problem.",
            source_language="mfe",
            target_language="mfe",
        )


def test_translation_rejects_empty_source() -> None:
    """Empty confirmed text must not be sent to the model."""

    with pytest.raises(ValueError, match="cannot be empty"):
        build_translation_prompt(
            "  ",
            source_language="mfe",
            target_language="en",
        )


def test_morisien_to_english_prompt_is_structured_and_quoted() -> None:
    """The prompt should retain source text as data and require JSON output."""

    prompt = build_translation_prompt(
        'Mo dir "pa azout tretman".',
        source_language="mfe",
        target_language="en",
    )

    assert "Morisien (Mauritian Creole) to English" in prompt
    assert r'\"pa azout tretman\"' in prompt
    assert '"source_language":"mfe"' in prompt
    assert '"target_language":"en"' in prompt
    assert '"uncertain_segments"' in prompt


def test_english_to_morisien_prompt_includes_direction_example() -> None:
    """English-to-Morisien requests should contain a relevant reviewed example."""

    prompt = build_translation_prompt(
        "The leaves are dry.",
        source_language="en",
        target_language="mfe",
    )

    assert "English to Morisien (Mauritian Creole)" in prompt
    assert "Divan for inn kas bann brans dan mo karo." in prompt
    assert '"source_language":"en"' in prompt
    assert '"target_language":"mfe"' in prompt


def test_translation_glossary_has_unique_morisien_terms() -> None:
    """Duplicate glossary keys would create conflicting prompt guidance."""

    terms = [morisien.casefold() for morisien, _ in MORISIEN_ENGLISH_GLOSSARY]

    assert len(terms) == len(set(terms))
    assert {"karo", "fey", "lapli", "delo"} <= set(terms)
