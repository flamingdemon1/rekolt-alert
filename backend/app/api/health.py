"""Small health route that does not load AI model weights."""

from fastapi import APIRouter

router = APIRouter(tags=["Health"])


@router.get("/health")
def health() -> dict[str, str]:
    """Confirm that the FastAPI process can receive requests."""

    return {"status": "ok"}
