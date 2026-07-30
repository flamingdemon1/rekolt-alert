"""Optional Streamlit weather harness without fixed demo coordinates."""

from typing import Any

import requests
import streamlit as st

from backend.app.tools.weather_tool import GeoWeatherEngine


def fetch_live_location() -> tuple[float, float] | None:
    """Return a real approximate IP location or no location."""

    try:
        response = requests.get("https://ipapi.co/json/", timeout=3)
        response.raise_for_status()
        data = response.json()
        return float(data["latitude"]), float(data["longitude"])
    except (
        KeyError,
        TypeError,
        ValueError,
        requests.RequestException,
    ):
        return None


def render_report(report: dict[str, Any]) -> None:
    """Render the weather assessment in the optional Streamlit harness."""

    if report["status"] == "critical":
        st.error(report["assessment"])
    elif report["status"] == "warning":
        st.warning(report["assessment"])
    elif report["status"] == "nominal":
        st.success(report["assessment"])
    else:
        st.info(report["assessment"])

    first, second, third = st.columns(3)
    first.metric("Temperature", f"{report['temperature']} °C")
    second.metric("Relative Humidity", f"{report['humidity']} %")
    third.metric("Precipitation", f"{report['precipitation']} mm")


st.set_page_config(
    page_title="GeoWeather Monitor",
    page_icon="🌾",
    layout="centered",
)
st.title("🌾 GeoWeather Agricultural Monitor")
st.write("Track environmental parameters for crop safety assessments.")

if st.button("Use approximate IP location"):
    with st.spinner("Resolving approximate IP coordinates..."):
        coordinates = fetch_live_location()

    if coordinates is None:
        st.warning(
            "Approximate location is unavailable. No default location was used."
        )
    else:
        latitude, longitude = coordinates
        st.success("Approximate IP location received.")
        with st.spinner("Fetching meteorological metrics..."):
            render_report(
                GeoWeatherEngine().fetch_and_assess(latitude, longitude)
            )
