"""FastAPI entry point for the Rekolt Alert backend."""

import asyncio
from contextlib import asynccontextmanager
from html import escape
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from pydantic import BaseModel

from backend.app.api.health import router as health_router
from backend.app.api.language import router as language_router
from backend.app.api.language import warm_language_models
from backend.app.config import settings
from backend.app.tools.weather_tool import GeoWeatherEngine


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Warm speech models in the background without blocking health checks."""

    warmup_task = asyncio.create_task(
        asyncio.to_thread(warm_language_models)
    )
    yield
    if not warmup_task.done():
        warmup_task.cancel()


app = FastAPI(title=settings.PROJECT_NAME, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(health_router, prefix=settings.API_V1_STR)
app.include_router(language_router, prefix=settings.API_V1_STR)

weather_engine = GeoWeatherEngine()
_VOICE_TEST_PAGE = (
    Path(__file__).resolve().parent / "dev" / "voice_test.html"
)


if settings.APP_ENV.casefold() == "development":

    @app.get("/", response_class=HTMLResponse, include_in_schema=False)
    def development_home() -> str:
        """Help developers who open Uvicorn's startup address reach the app."""
        links = "".join(
            f'<li><a href="{escape(origin)}/check-plant">{escape(origin)}/check-plant</a></li>'
            for origin in settings.cors_origins
            if origin.startswith(("http://localhost:", "http://127.0.0.1:"))
        )
        return (
            "<!doctype html><html lang=en><title>Rékolt Alert</title>"
            "<h1>Rékolt Alert backend is running</h1>"
            "<p>Open Dokter Plant on the port printed by npm run dev.</p>"
            f"<ul>{links}</ul>"
            '<p><a href="/api/v1/health">Backend health</a></p></html>'
        )

    @app.get("/dev/voice-test", include_in_schema=False)
    def voice_test_page() -> FileResponse:
        """Serve the local-only microphone integration harness."""

        return FileResponse(_VOICE_TEST_PAGE)


class WeatherRequest(BaseModel):
    """Coordinates supplied by a consenting frontend user."""

    latitude: float
    longitude: float


@app.post(f"{settings.API_V1_STR}/weather", tags=["Weather"])
async def get_weather_assessment(
    payload: WeatherRequest,
) -> dict:
    """Return Kavish's current weather assessment response."""

    result = weather_engine.fetch_and_assess(
        payload.latitude,
        payload.longitude,
    )
    if result["status"] == "error":
        raise HTTPException(
            status_code=502,
            detail=result["assessment"],
        )
    return result
