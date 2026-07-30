"""Runtime translation between farmer-confirmed Morisien and English."""

from __future__ import annotations

import json
from dataclasses import dataclass

from backend.app.prompts.translation_prompts import (
    TRANSLATION_SYSTEM_PROMPT,
    LanguageCode,
    build_translation_prompt,
)
from backend.app.services.gemma_client import TextGenerationClient


@dataclass(frozen=True)
class TranslationResult:
    """Validated translation returned by the hosted model."""

    source_language: LanguageCode
    target_language: LanguageCode
    translated_text: str
    uncertain_segments: tuple[str, ...]


class TranslationResponseError(RuntimeError):
    """The hosted model response did not match the translation contract."""


class TranslationService:
    """Translate bounded text and validate the model's JSON contract."""

    def __init__(self, client: TextGenerationClient) -> None:
        self.client = client

    def translate(
        self,
        source_text: str,
        *,
        source_language: LanguageCode,
        target_language: LanguageCode,
        source_confirmed: bool,
    ) -> TranslationResult:
        """Translate text after the caller establishes its provenance."""

        if not source_confirmed:
            raise ValueError(
                "source text must be confirmed before translation"
            )

        prompt = build_translation_prompt(
            source_text,
            source_language=source_language,
            target_language=target_language,
        )
        raw_response = self.client.generate_text(
            system_instruction=TRANSLATION_SYSTEM_PROMPT,
            prompt=prompt,
            json_output=True,
        )
        return self._parse_response(
            raw_response,
            source_language=source_language,
            target_language=target_language,
        )

    @staticmethod
    def _parse_response(
        raw_response: str,
        *,
        source_language: LanguageCode,
        target_language: LanguageCode,
    ) -> TranslationResult:
        try:
            payload = json.loads(raw_response)
        except json.JSONDecodeError as error:
            raise TranslationResponseError(
                "Gemma returned invalid translation JSON"
            ) from error

        if isinstance(payload, list) and len(payload) == 1:
            payload = payload[0]
        if not isinstance(payload, dict):
            raise TranslationResponseError(
                "Gemma returned an invalid translation object"
            )

        if payload.get("source_language") != source_language:
            raise TranslationResponseError(
                "Gemma changed the source language"
            )
        if payload.get("target_language") != target_language:
            raise TranslationResponseError(
                "Gemma changed the target language"
            )

        translated_text = payload.get("translated_text")
        uncertain_segments = payload.get("uncertain_segments")
        if not isinstance(translated_text, str) or not translated_text.strip():
            raise TranslationResponseError(
                "Gemma returned an empty translation"
            )
        if not isinstance(uncertain_segments, list) or not all(
            isinstance(segment, str) for segment in uncertain_segments
        ):
            raise TranslationResponseError(
                "Gemma returned invalid uncertain translation segments"
            )

        return TranslationResult(
            source_language=source_language,
            target_language=target_language,
            translated_text=translated_text.strip(),
            uncertain_segments=tuple(uncertain_segments),
        )
