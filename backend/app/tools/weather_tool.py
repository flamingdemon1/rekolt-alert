import requests
from typing import Dict, Any

class GeoWeatherEngine:

    def __init__(self):
        self.base_url = "https://api.open-meteo.com/v1/forecast"
        self.fallback_lat = -20.1609
        self.fallback_lon = 57.5012

    def get_user_location(self) -> tuple[float, float]:
        """
        Attempts to find the user's live physical location parameters via IP geolocation.
        Asks for confirmation in the terminal. If denied or failed, falls back to PL.
        """
        user_choice = input("Allow this application to access your exact location? (yes/no): ").strip().lower()
        
        if user_choice in ['y', 'yes']:
            try:
                # Querying a free geolocation endpoint to resolve current coordinates
                geo_resp = requests.get("https://ipapi.co/json/", timeout=5)
                geo_resp.raise_for_status()
                geo_data = geo_resp.json()
                
                lat = float(geo_data.get("latitude"))
                lon = float(geo_data.get("longitude"))
                print(f"📡 Location matched successfully: Lat {lat}, Lon {lon}")
                return lat, lon
            except Exception as e:
                print(f"⚠️ Geolocation request failed ({e}). Falling back to default region: Poland.")
        else:
            print("🔒 Location access denied by user. Defaulting parameters to Poland.")
            
        return self.fallback_lat, self.fallback_lon

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

# --- Quick Test Execution ---
if __name__ == "__main__":
    engine = GeoWeatherEngine()
    
    # 1. Resolve location based on active user prompt
    target_lat, target_lon = engine.get_user_location()
    
    # 2. Extract environmental data matching those parameters
    weather_report = engine.fetch_and_assess(target_lat, target_lon)
    
    print("\n--- Weather Assessment Report ---")
    print(f"Status: {weather_report['status'].upper()}")
    print(f"Temp: {weather_report['temperature']}°C")
    print(f"Humidity: {weather_report['humidity']}%")
    print(f"Precipitation: {weather_report['precipitation']}mm")
    print(f"Analysis: {weather_report['assessment']}")