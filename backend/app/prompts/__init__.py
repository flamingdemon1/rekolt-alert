"""Reviewed prompt components shared by the Rekolt Alert AI services."""

from .creole_prompts import (
    MORISIEN_LANGUAGE_CODE,
    MORISIEN_NORMALIZATION_SYSTEM_PROMPT,
    MORISIEN_TRANSCRIPTION_SYSTEM_PROMPT,
    build_morisien_normalization_prompt,
    build_morisien_transcription_prompt,
    select_morisien_terms,
)
from .translation_prompts import (
    MORISIEN_ENGLISH_GLOSSARY,
    SUPPORTED_TRANSLATION_LANGUAGES,
    TRANSLATION_SYSTEM_PROMPT,
    build_translation_prompt,
)

__all__ = [
    "MORISIEN_ENGLISH_GLOSSARY",
    "MORISIEN_LANGUAGE_CODE",
    "MORISIEN_NORMALIZATION_SYSTEM_PROMPT",
    "MORISIEN_TRANSCRIPTION_SYSTEM_PROMPT",
    "SUPPORTED_TRANSLATION_LANGUAGES",
    "TRANSLATION_SYSTEM_PROMPT",
    "build_morisien_normalization_prompt",
    "build_morisien_transcription_prompt",
    "build_translation_prompt",
    "select_morisien_terms",
]
