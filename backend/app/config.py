"""Validated backend configuration loaded from environment variables."""

from __future__ import annotations

from functools import cached_property

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings that are safe to import without an API key."""

    PROJECT_NAME: str = "Rekolt Alert"
    API_V1_STR: str = "/api/v1"
    APP_ENV: str = "development"
    GEMMA_API_KEY: SecretStr | None = None
    GEMMA_MODEL_NAME: str = "gemma-4-26b-a4b-it"
    GEMMA_FALLBACK_MODEL_NAME: str = "gemma-4-31b-it"
    MAX_UPLOAD_MB: int = 10
    CORS_ORIGINS: str = (
        "http://localhost:3000,http://127.0.0.1:3000,"
        "http://localhost:3001,http://127.0.0.1:3001,"
        "http://localhost:5500,http://127.0.0.1:5500"
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    @cached_property
    def cors_origins(self) -> tuple[str, ...]:
        """Return normalized origins for FastAPI's CORS middleware."""

        return tuple(
            origin.strip()
            for origin in self.CORS_ORIGINS.split(",")
            if origin.strip()
        )

    def gemma_api_key(self) -> str:
        """Return the configured key or fail only when Gemma is invoked."""

        if self.GEMMA_API_KEY is None:
            raise RuntimeError(
                "GEMMA_API_KEY is not configured for this environment"
            )
        value = self.GEMMA_API_KEY.get_secret_value().strip()
        if not value:
            raise RuntimeError(
                "GEMMA_API_KEY is not configured for this environment"
            )
        return value


settings = Settings()
