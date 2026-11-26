"""Small health route that does not load AI model weights."""

from fastapi import APIRouter

from backend.app.config import settings

router = APIRouter(tags=["Health"])


@router.get("/health")
def health() -> dict[str, str]:
    """Confirm that the FastAPI process can receive requests."""

    return {"status": "ok"}


@router.get("/health/voice")
def voice_configuration() -> dict[str, str]:
    """Report the configured Morisien voice without calling the provider."""
    if settings.AI_PROVIDER == "myt":
        return {"provider": "myt", "model": "myt/myt_tts", "voice": settings.MYT_TTS_VOICE}
    return {"provider": "local", "model": "MMS", "voice": "local"}
