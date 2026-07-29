import streamlit as st
import requests
from typing import Dict, Any

class GeoWeatherEngine:

    def __init__(self):
        self.base_url = "https://api.open-meteo.com/v1/forecast"
        # Default coordinates updated to Port Louis, Mauritius
        self.fallback_lat = -20.1609
        self.fallback_lon = 57.5012

    def fetch_live_location(self) -> tuple[float, float] or None:
        """Attempts background IP geolocation."""
        try:
            geo_resp = requests.get("https://ipapi.co/json/", timeout=3)
            geo_resp.raise_for_status()
            geo_data = geo_resp.json()
            return float(geo_data.get("latitude")), float(geo_data.get("longitude"))
        except Exception:
            return None

    def fetch_and_assess(self, lat: float, lon: float) -> Dict[str, Any]:
        """Queries weather analytics and returns an environmental agricultural assessment."""
        url = (
            f"{self.base_url}?latitude={lat}&longitude={lon}"
            f"&current=temperature_2m,relative_humidity_2m,precipitation"
            f"&timezone=auto"
        )
        
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            current = data.get("current", {})
            temp = current.get("temperature_2m", 20.0)
            humidity = current.get("relative_humidity_2m", 50)
            precip = current.get("precipitation", 0.0)
            
            if precip > 0.5:
                status = "critical"
                assessment = "🚨 CRITICAL ALERT: Heavy precipitation tracked. Risk of field flooding or nutrient runoff."
            elif temp > 35.0:
                status = "warning"
                assessment = "⚠️ HEAT WARNING: High temperature. Check irrigation arrays."
            elif humidity > 85 and temp > 20.0:
                status = "warning"
                assessment = "⚠️ RISK FOR FUNGAL INFECTION: Warm, highly humid conditions detected. Favorable for fungal activation."
            else:
                status = "nominal"
                assessment = "✅ SYSTEM NOMINAL: Crop parameters are stable. Ambient atmosphere is favorable."
                
            return {
                "status": status,
                "temperature": temp,
                "humidity": humidity,
                "precipitation": precip,
                "assessment": assessment
            }
        except Exception as e:
            return {
                "status": "error",
                "temperature": 0.0,
                "humidity": 0,
                "precipitation": 0.0,
                "assessment": f"Failed to sync weather parameters: {str(e)}"
            }

# --- Streamlit Interface Logic ---
st.set_page_config(page_title="GeoWeather Monitor", page_icon="🌾", layout="centered")

st.title("🌾 GeoWeather Agricultural Monitor")
st.write("Track environmental parameters for optimal crop safety assessments.")

engine = GeoWeatherEngine()

# Interactive prompt mimicking your user permission workflow
location_permission = st.radio(
    "Allow this application to access your exact location?",
    ("Select Option", "Yes, use live location", "No, use default location (Port Louis)")
)

if location_permission != "Select Option":
    
    # 1. Coordinate Resolution Phase
    if location_permission == "Yes, use live location":
        with st.spinner("Resolving coordinates via IP profile..."):
            coords = engine.fetch_live_location()
            if coords:
                target_lat, target_lon = coords
                st.success(f"📡 Location matched successfully: Lat `{target_lat}`, Lon `{target_lon}`")
            else:
                st.warning("⚠️ Geolocation request failed. Defaulting parameters to Port Louis, Mauritius.")
                target_lat, target_lon = engine.fallback_lat, engine.fallback_lon
    else:
        st.info("🔒 Location access denied. Defaulting parameters to Port Louis, Mauritius.")
        target_lat, target_lon = engine.fallback_lat, engine.fallback_lon

    # 2. Weather Assessment Phase
    with st.spinner("Fetching meteorological metrics from Open-Meteo..."):
        report = engine.fetch_and_assess(target_lat, target_lon)

    st.markdown("---")
    st.subheader("Weather Assessment Report")
    
    # Highlight card based on threat status
    if report["status"] == "critical":
        st.error(report["assessment"])
    elif report["status"] == "warning":
        st.warning(report["assessment"])
    elif report["status"] == "nominal":
        st.success(report["assessment"])
    else:
        st.info(report["assessment"])

    # UI Metrics Display Grid
    col1, col2, col3 = st.columns(3)
    col1.metric(label="Temperature", value=f"{report['temperature']} °C")
    col2.metric(label="Relative Humidity", value=f"{report['humidity']} %")
    col3.metric(label="Precipitation", value=f"{report['precipitation']} mm")