"""Tests for calibrated Morisien text-to-speech planning."""

import pytest

from backend.app.services.tts_service import (
    DEFAULT_MORISIEN_TTS_CONFIG,
    MORISIEN_TTS_MODEL_ID,
    MorisienTTSConfig,
    TTSSegment,
    build_morisien_tts_plan,
)


def test_tts_configuration_matches_reviewed_pilot() -> None:
    """The repository must retain Shihad's reviewed rhythm settings."""

    config = DEFAULT_MORISIEN_TTS_CONFIG

    assert config.model_id == "facebook/mms-tts-mfe"
    assert MORISIEN_TTS_MODEL_ID == config.model_id
    assert config.speaking_rate == 1.15
    assert config.noise_scale_duration == 0.40
    assert config.noise_scale == 0.60
    assert config.pause_lengths_ms[","] == 500
    assert config.pause_lengths_ms["."] == 700


def test_tts_plan_preserves_phrases_and_calibrated_pause() -> None:
    """A comma between phrases should produce Shihad's measured pause."""

    plan = build_morisien_tts_plan(
        "Apre gro lapli yer, delo inn res dan mo karo."
    )

    assert plan == (
        TTSSegment(text="Apre gro lapli yer"),
        TTSSegment(pause_ms=500),
        TTSSegment(text="delo inn res dan mo karo"),
    )


def test_tts_plan_uses_longest_consecutive_punctuation_pause() -> None:
    """Consecutive punctuation must create one pause rather than duplicates."""

    plan = build_morisien_tts_plan("Eski ena bebet?! Mo pa kone.")

    assert plan == (
        TTSSegment(text="Eski ena bebet"),
        TTSSegment(pause_ms=700),
        TTSSegment(text="Mo pa kone"),
    )


def test_tts_plan_rejects_empty_text() -> None:
    """Empty farmer-facing output must not invoke model inference."""

    with pytest.raises(ValueError, match="cannot be empty"):
        build_morisien_tts_plan("   ")


def test_tts_plan_rejects_oversized_text() -> None:
    """The service should bound expensive synthesis requests."""

    config = MorisienTTSConfig(maximum_text_characters=10)

    with pytest.raises(ValueError, match="10 characters or fewer"):
        build_morisien_tts_plan(
            "Sa fraz-la tro long.",
            config=config,
        )


def test_tts_segment_requires_exactly_one_content_type() -> None:
    """A segment cannot be both speech and silence."""

    with pytest.raises(ValueError, match="text or a pause"):
        TTSSegment()

    with pytest.raises(ValueError, match="text or a pause"):
        TTSSegment(text="delo", pause_ms=500)
