"""Calibrated Morisien text-to-speech service.

Shihad owns Morisien pronunciation and rhythm evaluation. Kavish owns wiring
this service into the backend API and deployment environment.
"""

from __future__ import annotations

import io
import re
import wave
from collections.abc import Mapping
from dataclasses import dataclass, field
from threading import Lock
from types import MappingProxyType
from typing import Any, Final

MORISIEN_TTS_MODEL_ID: Final = "facebook/mms-tts-mfe"
_PUNCTUATION_PATTERN: Final = re.compile(r"[^,;:.!?]+|[,;:.!?]+")
_SINGLE_PASS_MAX_CHARACTERS: Final = 180


@dataclass(frozen=True)
class MorisienTTSConfig:
    """Reviewed synthesis and pause settings from the pilot evaluation."""

    model_id: str = MORISIEN_TTS_MODEL_ID
    speaking_rate: float = 1.15
    noise_scale_duration: float = 0.40
    noise_scale: float = 0.60
    seed: int = 42
    maximum_text_characters: int = 2_000
    minimum_internal_silence_ms: int = 180
    retained_internal_silence_ms: int = 90
    silence_threshold_db: float = -35.0
    pause_lengths_ms: Mapping[str, int] = field(
        default_factory=lambda: MappingProxyType(
            {
                ",": 500,
                ";": 600,
                ":": 500,
                ".": 700,
                "!": 650,
                "?": 700,
            }
        )
    )


DEFAULT_MORISIEN_TTS_CONFIG: Final = MorisienTTSConfig()


@dataclass(frozen=True)
class TTSSegment:
    """One spoken phrase or deliberate punctuation pause."""

    text: str | None = None
    pause_ms: int | None = None

    def __post_init__(self) -> None:
        has_text = self.text is not None
        has_pause = self.pause_ms is not None
        if has_text == has_pause:
            raise ValueError("a TTS segment must contain text or a pause")


def build_morisien_tts_plan(
    text: str,
    *,
    config: MorisienTTSConfig = DEFAULT_MORISIEN_TTS_CONFIG,
) -> tuple[TTSSegment, ...]:
    """Split Morisien text into phrases and calibrated punctuation pauses."""

    cleaned_text = text.strip()
    if not cleaned_text:
        raise ValueError("TTS text cannot be empty")
    if len(cleaned_text) > config.maximum_text_characters:
        raise ValueError(
            "TTS text must be "
            f"{config.maximum_text_characters} characters or fewer"
        )

    tokens = _PUNCTUATION_PATTERN.findall(cleaned_text)
    segments: list[TTSSegment] = []

    for index, token in enumerate(tokens):
        token = token.strip()
        if not token:
            continue

        if token[0] not in config.pause_lengths_ms:
            segments.append(TTSSegment(text=token))
            continue

        has_later_phrase = any(
            later.strip()
            and later.strip()[0] not in config.pause_lengths_ms
            for later in tokens[index + 1 :]
        )
        if not has_later_phrase:
            continue

        pause_ms = max(
            config.pause_lengths_ms[character]
            for character in token
            if character in config.pause_lengths_ms
        )
        segments.append(TTSSegment(pause_ms=pause_ms))

    if not any(segment.text for segment in segments):
        raise ValueError("TTS text must contain a spoken phrase")

    return tuple(segments)


class MorisienTTSService:
    """Generate calibrated Morisien WAV audio with lazy model loading."""

    def __init__(
        self,
        *,
        config: MorisienTTSConfig = DEFAULT_MORISIEN_TTS_CONFIG,
        device: str = "cpu",
    ) -> None:
        self.config = config
        self.device = device
        self._model: Any | None = None
        self._tokenizer: Any | None = None
        self._numpy: Any | None = None
        self._torch: Any | None = None
        self._runtime_lock = Lock()
        self._inference_lock = Lock()
        self._is_warm = False

    def _load_runtime(self) -> None:
        """Load optional heavy dependencies and model weights on first use."""

        if self._model is not None:
            return
        with self._runtime_lock:
            if self._model is not None:
                return
            try:
                import numpy
                import torch
                from transformers import AutoTokenizer, VitsModel
            except ImportError as error:
                raise RuntimeError(
                    "Morisien TTS requires torch, transformers, and numpy"
                ) from error

            tokenizer = AutoTokenizer.from_pretrained(
                self.config.model_id
            )
            model = VitsModel.from_pretrained(self.config.model_id)
            model.to(self.device)
            model.eval()
            model.speaking_rate = self.config.speaking_rate
            model.noise_scale_duration = self.config.noise_scale_duration
            model.noise_scale = self.config.noise_scale

            self._numpy = numpy
            self._torch = torch
            self._tokenizer = tokenizer
            self._model = model

    def warm_up(self) -> None:
        """Load and exercise the voice model before the first spoken reply."""

        self._load_runtime()
        if not self._is_warm:
            self.synthesize_wav("Bonzour.")

    def synthesize_wav(self, text: str) -> bytes:
        """Return mono 16-bit WAV bytes for supplied Morisien text."""

        plan = build_morisien_tts_plan(text, config=self.config)
        spoken_phrases = tuple(
            segment for segment in plan if segment.text is not None
        )
        if (
            len(spoken_phrases) <= 2
            and len(text.strip()) <= _SINGLE_PASS_MAX_CHARACTERS
        ):
            # One model call is faster and lets MMS retain natural punctuation
            # for the short replies used by voice conversation.
            plan = (TTSSegment(text=text.strip()),)
        self._load_runtime()

        numpy = self._numpy
        torch = self._torch
        tokenizer = self._tokenizer
        model = self._model
        if any(item is None for item in (numpy, torch, tokenizer, model)):
            raise RuntimeError("Morisien TTS runtime failed to initialize")

        sample_rate = int(model.config.sampling_rate)
        audio_parts: list[Any] = []
        phrase_number = 0

        for segment in plan:
            if segment.pause_ms is not None:
                pause_samples = int(
                    sample_rate * segment.pause_ms / 1_000
                )
                audio_parts.append(
                    numpy.zeros(pause_samples, dtype=numpy.float32)
                )
                continue

            inputs = tokenizer(segment.text, return_tensors="pt")
            inputs = {
                name: value.to(self.device)
                for name, value in inputs.items()
            }

            torch.manual_seed(self.config.seed + phrase_number)
            phrase_number += 1

            with self._inference_lock, torch.inference_mode():
                waveform = model(**inputs).waveform
                self._is_warm = True

            phrase_audio = (
                waveform.squeeze().detach().cpu().float().numpy()
            )
            phrase_audio = self._trim_edge_silence(
                phrase_audio,
                sample_rate,
            )
            phrase_audio = self._compress_internal_silences(
                phrase_audio,
                sample_rate,
            )
            audio_parts.append(phrase_audio)

        audio = numpy.concatenate(audio_parts)
        audio = self._finish_waveform(audio, sample_rate)
        return self._encode_wav(audio, sample_rate)

    def _trim_edge_silence(
        self,
        audio: Any,
        sample_rate: int,
    ) -> Any:
        """Remove excessive phrase-edge silence before joining phrases."""

        numpy = self._numpy
        maximum = float(numpy.max(numpy.abs(audio)))
        if maximum == 0:
            return audio

        voiced = numpy.flatnonzero(numpy.abs(audio) > maximum * 0.015)
        if len(voiced) == 0:
            return audio

        padding = int(sample_rate * 0.03)
        start = max(0, int(voiced[0]) - padding)
        end = min(len(audio), int(voiced[-1]) + padding)
        return audio[start:end]

    def _compress_internal_silences(
        self,
        audio: Any,
        sample_rate: int,
    ) -> Any:
        """Shorten excessive model-generated pauses inside a phrase."""

        numpy = self._numpy
        frame_samples = max(1, int(sample_rate * 0.01))
        padding = (-len(audio)) % frame_samples
        frames = numpy.pad(audio, (0, padding)).reshape(
            -1,
            frame_samples,
        )

        rms = numpy.sqrt(numpy.mean(frames**2, axis=1) + 1e-12)
        peak = max(float(rms.max()), 1e-12)
        decibels = 20 * numpy.log10((rms / peak) + 1e-12)
        silent_frames = decibels < self.config.silence_threshold_db
        transitions = numpy.diff(
            numpy.pad(silent_frames.astype(int), (1, 1))
        )
        starts = numpy.where(transitions == 1)[0]
        ends = numpy.where(transitions == -1)[0]

        minimum_samples = int(
            sample_rate
            * self.config.minimum_internal_silence_ms
            / 1_000
        )
        retained_samples = int(
            sample_rate
            * self.config.retained_internal_silence_ms
            / 1_000
        )
        output_parts: list[Any] = []
        cursor = 0

        for start_frame, end_frame in zip(starts, ends, strict=True):
            start = int(start_frame) * frame_samples
            end = min(int(end_frame) * frame_samples, len(audio))
            is_internal = start > 0 and end < len(audio)
            if is_internal and end - start >= minimum_samples:
                output_parts.append(audio[cursor:start])
                output_parts.append(
                    numpy.zeros(retained_samples, dtype=audio.dtype)
                )
                cursor = end

        output_parts.append(audio[cursor:])
        return numpy.concatenate(output_parts)

    def _finish_waveform(self, audio: Any, sample_rate: int) -> Any:
        """Normalize volume and add short fades to avoid edge clicks."""

        numpy = self._numpy
        audio = audio.astype(numpy.float32, copy=False)
        audio = audio - numpy.mean(audio)
        peak = float(numpy.max(numpy.abs(audio)))
        if peak > 0:
            audio = audio * (0.95 / peak)

        fade_samples = min(int(sample_rate * 0.01), len(audio) // 2)
        if fade_samples:
            fade = numpy.linspace(
                0.0,
                1.0,
                fade_samples,
                dtype=numpy.float32,
            )
            audio[:fade_samples] *= fade
            audio[-fade_samples:] *= fade[::-1]

        return audio

    def _encode_wav(self, audio: Any, sample_rate: int) -> bytes:
        """Encode normalized floating-point audio as mono PCM WAV."""

        numpy = self._numpy
        pcm_audio = numpy.clip(audio, -1.0, 1.0)
        pcm_audio = (pcm_audio * 32_767).astype(numpy.int16)

        output = io.BytesIO()
        with wave.open(output, "wb") as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(sample_rate)
            wav_file.writeframes(pcm_audio.tobytes())

        return output.getvalue()
