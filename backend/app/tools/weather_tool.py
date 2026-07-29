import requests
from typing import Dict, Any

class GeoWeatherEngine:

    def __init__(self):
        self.base_url = "https://api.open-meteo.com/v1/forecast"

    def fetch_and_assess(self, lat: float, lon: float) -> Dict[str, Any]:
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
            
            # Rule-based agro-meteorological core evaluation
            if precip > 0.5:
                status = "critical"
                assessment = "🚨 CRITICAL ALERT: Heavy precipitation tracked. Risk of field flooding or nutrient runoff."
            elif temp > 35.0:
                status = "warning"
                assessment = "⚠️ HEAT WARNING: High temperature boundary exceeded. Check irrigation arrays."
            elif humidity > 85 and temp > 20.0:
                status = "warning"
                assessment = "⚠️ PATHOGEN RISK: Warm, highly humid conditions detected. Favorable for fungal activation."
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