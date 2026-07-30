"""Morisien speech recognition and conservative transcript preparation."""

from __future__ import annotations

import io
import wave
from threading import Lock
from typing import Any, Final

from backend.app.services.language_service import (
    correct_reviewed_morisien_asr_tokens,
    split_unique_morisien_word_boundaries,
)

MORISIEN_ASR_MODEL_ID: Final = "facebook/mms-1b-all"
MORISIEN_LANGUAGE_ADAPTER: Final = "mfe"
ENGLISH_LANGUAGE_ADAPTER: Final = "eng"
TARGET_SAMPLE_RATE: Final = 16_000
_LANGUAGE_ADAPTERS: Final = {
    "mfe": MORISIEN_LANGUAGE_ADAPTER,
    "en": ENGLISH_LANGUAGE_ADAPTER,
}


def prepare_morisien_transcript(mms_transcript: str) -> dict[str, Any]:
    """Apply only deterministic corrections and require farmer review."""

    cleaned = mms_transcript.strip()
    if not cleaned:
        raise ValueError("MMS returned an empty transcript")

    corrected_transcript, corrections = (
        split_unique_morisien_word_boundaries(cleaned)
    )
    corrected_transcript, reviewed_corrections = (
        correct_reviewed_morisien_asr_tokens(corrected_transcript)
    )
    corrections = (*corrections, *reviewed_corrections)
    return {
        "language": "mfe",
        "raw_transcript": cleaned,
        "corrected_transcript": corrected_transcript,
        "automatic_corrections": [
            {
                "original": correction.original,
                "replacement": correction.replacement,
            }
            for correction in corrections
        ],
        "requires_confirmation": True,
    }


def prepare_english_transcript(mms_transcript: str) -> dict[str, Any]:
    """Return an English MMS draft without Morisien spelling changes."""

    cleaned = mms_transcript.strip()
    if not cleaned:
        raise ValueError("MMS returned an empty transcript")
    return {
        "language": "en",
        "raw_transcript": cleaned,
        "corrected_transcript": cleaned,
        "automatic_corrections": [],
        "requires_confirmation": True,
    }


def decode_pcm_wav(
    wav_bytes: bytes,
    *,
    target_sample_rate: int = TARGET_SAMPLE_RATE,
) -> Any:
    """Decode PCM WAV bytes to a mono float waveform for MMS."""

    try:
        with wave.open(io.BytesIO(wav_bytes), "rb") as wav_file:
            channels = wav_file.getnchannels()
            sample_width = wav_file.getsampwidth()
            sample_rate = wav_file.getframerate()
            frame_count = wav_file.getnframes()
            compression = wav_file.getcomptype()
            audio_bytes = wav_file.readframes(frame_count)
    except (EOFError, wave.Error) as error:
        raise ValueError(
            "audio must be a valid uncompressed PCM WAV file"
        ) from error

    if compression != "NONE":
        raise ValueError("compressed WAV audio is not supported")
    if channels not in (1, 2):
        raise ValueError("WAV audio must contain one or two channels")
    if sample_width not in (1, 2, 4):
        raise ValueError("WAV audio must use 8, 16, or 32-bit PCM")
    if sample_rate <= 0 or frame_count <= 0:
        raise ValueError("WAV audio contains no usable samples")

    try:
        import numpy
    except ImportError as error:
        raise RuntimeError(
            "Morisien ASR audio decoding requires numpy"
        ) from error

    dtype_by_width = {
        1: numpy.uint8,
        2: numpy.dtype("<i2"),
        4: numpy.dtype("<i4"),
    }
    samples = numpy.frombuffer(
        audio_bytes,
        dtype=dtype_by_width[sample_width],
    ).astype(numpy.float32)

    if sample_width == 1:
        samples = (samples - 128.0) / 128.0
    else:
        samples /= float(2 ** (sample_width * 8 - 1))

    if channels == 2:
        samples = samples.reshape(-1, 2).mean(axis=1)

    if sample_rate != target_sample_rate:
        target_length = max(
            1,
            round(len(samples) * target_sample_rate / sample_rate),
        )
        old_positions = numpy.linspace(
            0.0,
            1.0,
            num=len(samples),
            endpoint=False,
        )
        new_positions = numpy.linspace(
            0.0,
            1.0,
            num=target_length,
            endpoint=False,
        )
        samples = numpy.interp(
            new_positions,
            old_positions,
            samples,
        ).astype(numpy.float32)

    peak = float(numpy.max(numpy.abs(samples)))
    if peak <= 0.001:
        raise ValueError("WAV audio contains only silence")

    # Remove long dead air while retaining natural word-edge consonants.
    active_threshold = max(0.006, peak * 0.025)
    active_samples = numpy.flatnonzero(
        numpy.abs(samples) >= active_threshold
    )
    if active_samples.size:
        padding = round(target_sample_rate * 0.18)
        start = max(0, int(active_samples[0]) - padding)
        end = min(
            len(samples),
            int(active_samples[-1]) + padding + 1,
        )
        samples = samples[start:end]

    # MMS is more reliable when quiet laptop microphones use the full range.
    peak = float(numpy.max(numpy.abs(samples)))
    if 0.005 < peak < 0.95:
        samples = numpy.clip(
            samples * (0.95 / peak),
            -1.0,
            1.0,
        ).astype(numpy.float32)

    return samples


class MorisienASRService:
    """Transcribe Morisien or English with one shared MMS base model."""

    def __init__(self, *, device: str = "cpu") -> None:
        self.device = device
        self._model: Any | None = None
        self._processor: Any | None = None
        self._torch: Any | None = None
        self._runtime_lock = Lock()
        self._inference_lock = Lock()
        self._is_warm = False
        self._active_language = "mfe"

    def _load_runtime(self) -> None:
        if self._model is not None:
            return
        with self._runtime_lock:
            if self._model is not None:
                return
            try:
                import torch
                from transformers import AutoProcessor, Wav2Vec2ForCTC
            except ImportError as error:
                raise RuntimeError(
                    "Morisien ASR requires torch, transformers, and numpy"
                ) from error

            processor = AutoProcessor.from_pretrained(
                MORISIEN_ASR_MODEL_ID
            )
            model = Wav2Vec2ForCTC.from_pretrained(
                MORISIEN_ASR_MODEL_ID
            )
            processor.tokenizer.set_target_lang(
                MORISIEN_LANGUAGE_ADAPTER
            )
            model.load_adapter(MORISIEN_LANGUAGE_ADAPTER)
            model.to(self.device)
            model.eval()

            self._torch = torch
            self._processor = processor
            self._model = model

    def _activate_language(self, language: str) -> None:
        """Switch the small MMS language adapter under the inference lock."""

        adapter = _LANGUAGE_ADAPTERS.get(language)
        if adapter is None:
            raise ValueError("speech language must be mfe or en")
        if language == self._active_language:
            return

        processor = self._processor
        model = self._model
        if processor is None or model is None:
            raise RuntimeError("MMS ASR runtime failed to initialize")
        processor.tokenizer.set_target_lang(adapter)
        model.load_adapter(adapter)
        model.to(self.device)
        model.eval()
        self._active_language = language

    def warm_up(self) -> None:
        """Load MMS and perform its one-time inference setup."""

        self._load_runtime()
        torch = self._torch
        processor = self._processor
        model = self._model
        if any(item is None for item in (torch, processor, model)):
            raise RuntimeError("Morisien ASR runtime failed to initialize")

        with self._inference_lock:
            if self._is_warm:
                return
            inputs = processor(
                [0.0] * 1_600,
                sampling_rate=TARGET_SAMPLE_RATE,
                return_tensors="pt",
            )
            inputs = {
                name: value.to(self.device)
                for name, value in inputs.items()
            }
            with torch.inference_mode():
                model(**inputs)
            self._is_warm = True

    def transcribe_wav(
        self,
        wav_bytes: bytes,
        *,
        language: str = "mfe",
    ) -> dict[str, Any]:
        """Return a conservative transcript object for farmer review."""

        waveform = decode_pcm_wav(wav_bytes)
        self._load_runtime()

        torch = self._torch
        processor = self._processor
        model = self._model
        if any(item is None for item in (torch, processor, model)):
            raise RuntimeError("Morisien ASR runtime failed to initialize")

        with self._inference_lock, torch.inference_mode():
            self._activate_language(language)
            inputs = processor(
                waveform,
                sampling_rate=TARGET_SAMPLE_RATE,
                return_tensors="pt",
            )
            inputs = {
                name: value.to(self.device)
                for name, value in inputs.items()
            }
            logits = model(**inputs).logits
            predicted_ids = torch.argmax(logits, dim=-1)
            transcript = processor.batch_decode(predicted_ids)[0]
            self._is_warm = True

        if language == "en":
            return prepare_english_transcript(transcript)
        return prepare_morisien_transcript(transcript)
