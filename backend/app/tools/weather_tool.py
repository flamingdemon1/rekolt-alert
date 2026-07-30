"""Coordinate-based Open-Meteo assessment without demo-location fallbacks."""

from typing import Any

import requests


class GeoWeatherEngine:
    """Retrieve weather only for caller-supplied or real IP coordinates."""

    def __init__(self) -> None:
        self.base_url = "https://api.open-meteo.com/v1/forecast"

    def get_user_location(self) -> tuple[float, float] | None:
        """Return an explicitly approved approximate IP location, if available."""

        user_choice = input(
            "Allow approximate IP location? (yes/no): "
        ).strip().lower()
        if user_choice not in {"y", "yes"}:
            print("Location access was not approved.")
            return None

        try:
            response = requests.get("https://ipapi.co/json/", timeout=5)
            response.raise_for_status()
            data = response.json()
            latitude = float(data["latitude"])
            longitude = float(data["longitude"])
        except (
            KeyError,
            TypeError,
            ValueError,
            requests.RequestException,
        ) as error:
            print(f"Approximate location is unavailable: {error}")
            return None

        print(
            "Approximate IP location received: "
            f"Lat {latitude}, Lon {longitude}"
        )
        return latitude, longitude

    def fetch_and_assess(
        self,
        lat: float,
        lon: float,
    ) -> dict[str, Any]:
        """Return an agricultural weather assessment for exact coordinates."""

        url = (
            f"{self.base_url}?latitude={lat}&longitude={lon}"
            "&current=temperature_2m,relative_humidity_2m,precipitation"
            "&timezone=auto"
        )

        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            current = response.json()["current"]
            temperature = float(current["temperature_2m"])
            humidity = float(current["relative_humidity_2m"])
            precipitation = float(current["precipitation"])

            if precipitation > 0.5:
                status = "critical"
                assessment = (
                    "Heavy precipitation detected. Field flooding or nutrient "
                    "runoff may be possible."
                )
            elif temperature > 35:
                status = "warning"
                assessment = (
                    "High temperature detected. Check irrigation and crop "
                    "heat stress."
                )
            elif humidity > 85 and temperature > 20:
                status = "warning"
                assessment = (
                    "Warm, humid conditions may increase fungal risk."
                )
            else:
                status = "nominal"
                assessment = "Current agricultural weather is stable."

            return {
                "status": status,
                "temperature": temperature,
                "humidity": humidity,
                "precipitation": precipitation,
                "assessment": assessment,
            }
        except (
            KeyError,
            TypeError,
            ValueError,
            requests.RequestException,
        ) as error:
            return {
                "status": "error",
                "temperature": 0.0,
                "humidity": 0,
                "precipitation": 0.0,
                "assessment": f"Weather service failed: {error!s}",
            }


if __name__ == "__main__":
    engine = GeoWeatherEngine()
    coordinates = engine.get_user_location()
    if coordinates is None:
        raise SystemExit("No weather requested without a real location.")

    weather_report = engine.fetch_and_assess(*coordinates)
    print("\n--- Weather Assessment Report ---")
    print(f"Status: {weather_report['status'].upper()}")
    print(f"Temperature: {weather_report['temperature']}°C")
    print(f"Humidity: {weather_report['humidity']}%")
    print(f"Precipitation: {weather_report['precipitation']} mm")
    print(f"Analysis: {weather_report['assessment']}")
