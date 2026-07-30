"""Tests for truthful coordinate-based backend weather behavior."""

from __future__ import annotations

import builtins
from typing import Any

import pytest
import requests

from backend.app.tools.weather_tool import GeoWeatherEngine


class FakeResponse:
    """Minimal requests response used by the weather adapter tests."""

    def __init__(self, payload: dict[str, Any]) -> None:
        self.payload = payload

    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict[str, Any]:
        return self.payload


def test_backend_weather_uses_supplied_coordinates(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The weather request must use the same latitude and longitude."""

    requested_urls: list[str] = []

    def fake_get(url: str, *, timeout: int) -> FakeResponse:
        requested_urls.append(url)
        assert timeout == 10
        return FakeResponse(
            {
                "current": {
                    "temperature_2m": 24,
                    "relative_humidity_2m": 82,
                    "precipitation": 0,
                }
            }
        )

    monkeypatch.setattr(requests, "get", fake_get)
    result = GeoWeatherEngine().fetch_and_assess(-20.27, 57.37)

    assert result["status"] == "nominal"
    assert "latitude=-20.27" in requested_urls[0]
    assert "longitude=57.37" in requested_urls[0]


def test_backend_weather_failure_has_no_demo_location(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A failed IP lookup returns no coordinates instead of a fixed fallback."""

    monkeypatch.setattr(
        builtins,
        "input",
        lambda _: "yes",
    )

    def fail_get(url: str, *, timeout: int) -> FakeResponse:
        raise requests.ConnectionError(f"{url} unavailable after {timeout}s")

    monkeypatch.setattr(requests, "get", fail_get)
    engine = GeoWeatherEngine()

    assert engine.get_user_location() is None
    assert not hasattr(engine, "fallback_lat")
    assert not hasattr(engine, "fallback_lon")
