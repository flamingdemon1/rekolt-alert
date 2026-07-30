"""Small, lazy Google Gen AI boundary for hosted Gemma calls."""

from __future__ import annotations

import json
import time
from collections.abc import Callable, Sequence
from typing import Any, Protocol

_RETRYABLE_STATUS_CODES = frozenset({429, 500, 502, 503, 504})


class TextGenerationClient(Protocol):
    """Interface used by translation and conversation services."""

    def generate_text(
        self,
        *,
        system_instruction: str,
        prompt: str,
        json_output: bool = False,
    ) -> str:
        """Generate text without exposing provider objects to other modules."""


class GoogleGemmaClient:
    """Call the configured hosted Gemma model through Google's SDK."""

    def __init__(
        self,
        *,
        api_key: str,
        model_name: str,
        fallback_model_names: Sequence[str] = (),
        maximum_attempts: int = 4,
        maximum_output_tokens: int = 512,
        thinking_level: str | None = None,
        request_timeout_ms: int = 20_000,
        initial_retry_delay_seconds: float = 1.0,
        sleep: Callable[[float], None] = time.sleep,
    ) -> None:
        if maximum_attempts < 1:
            raise ValueError("maximum_attempts must be at least 1")
        if maximum_output_tokens < 1:
            raise ValueError("maximum_output_tokens must be at least 1")
        if request_timeout_ms < 1:
            raise ValueError("request_timeout_ms must be at least 1")
        if thinking_level not in {None, "minimal", "high"}:
            raise ValueError(
                "thinking_level must be minimal, high, or None"
            )
        self.api_key = api_key
        self.model_name = model_name
        self.fallback_model_names = tuple(
            dict.fromkeys(
                name.strip()
                for name in fallback_model_names
                if name.strip() and name.strip() != model_name
            )
        )
        self.maximum_attempts = maximum_attempts
        self.maximum_output_tokens = maximum_output_tokens
        self.thinking_level = thinking_level
        self.request_timeout_ms = request_timeout_ms
        self.initial_retry_delay_seconds = (
            initial_retry_delay_seconds
        )
        self.sleep = sleep
        self._client: Any | None = None
        self._types: Any | None = None

    def _load_runtime(self) -> tuple[Any, Any]:
        if self._client is not None and self._types is not None:
            return self._client, self._types

        try:
            from google import genai
            from google.genai import types
        except ImportError as error:
            raise RuntimeError(
                "Hosted Gemma calls require the google-genai package"
            ) from error

        self._client = genai.Client(
            api_key=self.api_key,
            http_options=types.HttpOptions(
                timeout=self.request_timeout_ms,
            ),
        )
        self._types = types
        return self._client, self._types

    @staticmethod
    def _response_text(response: Any) -> str | None:
        """Extract visible text without depending only on SDK convenience."""

        direct_text = getattr(response, "text", None)
        if isinstance(direct_text, str) and direct_text.strip():
            return direct_text.strip()

        parsed = getattr(response, "parsed", None)
        if isinstance(parsed, dict):
            return json.dumps(parsed, ensure_ascii=False)

        candidates = getattr(response, "candidates", None) or ()
        if not candidates:
            return None
        content = getattr(candidates[0], "content", None)
        parts = getattr(content, "parts", None) or ()
        visible_parts = [
            part.text
            for part in parts
            if isinstance(getattr(part, "text", None), str)
            and not getattr(part, "thought", False)
        ]
        combined = "".join(visible_parts).strip()
        return combined or None

    @staticmethod
    def _finish_reason(response: Any) -> str:
        candidates = getattr(response, "candidates", None) or ()
        if not candidates:
            return "NO_CANDIDATE"
        reason = getattr(candidates[0], "finish_reason", None)
        return str(getattr(reason, "value", reason) or "UNKNOWN")

    def _generate(
        self,
        *,
        system_instruction: str,
        contents: Any,
        json_output: bool = False,
    ) -> str:
        """Return provider text with bounded retries and useful empty handling."""

        client, types = self._load_runtime()
        last_finish_reason = "UNKNOWN"
        last_provider_error: Exception | None = None
        model_names = (self.model_name, *self.fallback_model_names)
        for model_index, model_name in enumerate(model_names):
            has_fallback = model_index < len(model_names) - 1
            for attempt in range(self.maximum_attempts):
                config_values: dict[str, Any] = {
                    "system_instruction": system_instruction,
                    "temperature": 0.05,
                    "candidate_count": 1,
                    "max_output_tokens": min(
                        self.maximum_output_tokens * (2**attempt),
                        2_048,
                    ),
                }
                if json_output:
                    config_values["response_mime_type"] = "application/json"
                thinking_config_type = getattr(
                    types,
                    "ThinkingConfig",
                    None,
                )
                thinking_level_type = getattr(
                    types,
                    "ThinkingLevel",
                    None,
                )
                if (
                    self.thinking_level is not None
                    and thinking_config_type is not None
                    and thinking_level_type is not None
                ):
                    thinking_level = getattr(
                        thinking_level_type,
                        self.thinking_level.upper(),
                    )
                    config_values["thinking_config"] = (
                        thinking_config_type(
                            thinking_level=thinking_level,
                        )
                    )
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=contents,
                        config=types.GenerateContentConfig(
                            **config_values
                        ),
                    )
                except Exception as error:
                    status_code = getattr(error, "code", None)
                    is_timeout = "timeout" in type(error).__name__.casefold()
                    is_retryable = (
                        status_code in _RETRYABLE_STATUS_CODES
                        or is_timeout
                    )
                    if not is_retryable:
                        raise RuntimeError(
                            "The hosted Gemma request could not be completed"
                        ) from error
                    last_provider_error = error
                    if has_fallback:
                        break
                    if (
                        model_index > 0
                        or attempt == self.maximum_attempts - 1
                    ):
                        raise RuntimeError(
                            "The hosted Gemma request could not be completed"
                        ) from error
                    retry_delay = (
                        self.initial_retry_delay_seconds * (2**attempt)
                    )
                    self.sleep(retry_delay)
                    continue

                text = self._response_text(response)
                last_finish_reason = self._finish_reason(response)
                output_was_cut_off = (
                    "MAX_TOKENS" in last_finish_reason
                )
                if text is not None and not output_was_cut_off:
                    return text

        if last_provider_error is not None:
            raise RuntimeError(
                "Both hosted Gemma models were temporarily unavailable"
            ) from last_provider_error

        raise RuntimeError(
            "Gemma did not produce a reply "
            f"(finish reason: {last_finish_reason}). Please retry."
        )

    def generate_text(
        self,
        *,
        system_instruction: str,
        prompt: str,
        json_output: bool = False,
    ) -> str:
        """Generate a text-only response."""

        return self._generate(
            system_instruction=system_instruction,
            contents=prompt,
            json_output=json_output,
        )

    def generate_multimodal_text(
        self,
        *,
        system_instruction: str,
        prompt: str,
        images: Sequence[tuple[bytes, str]],
        json_output: bool = False,
    ) -> str:
        """Generate a response from text and validated inline images."""

        _, types = self._load_runtime()
        contents = [types.Part.from_text(text=prompt)]
        contents.extend(
            types.Part.from_bytes(data=data, mime_type=mime_type)
            for data, mime_type in images
        )
        return self._generate(
            system_instruction=system_instruction,
            contents=contents,
            json_output=json_output,
        )
