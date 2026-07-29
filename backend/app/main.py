from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.app.config import settings
from backend.app.tools.weather_tool import GeoWeatherEngine

# 1. Initialize the FastAPI app instance
app = FastAPI(title=settings.PROJECT_NAME)

# 2. Web Cross-Origin Configuration (Allows the website to make requests to the API)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Instantiate the standalone core weather engine
weather_engine = GeoWeatherEngine()

# 4. Define the incoming request data structure for the website
class WeatherRequest(BaseModel):
    latitude: float
    longitude: float

# 5. Expose the weather assessment route directly
@app.post(f"{settings.API_V1_STR}/weather", tags=["Weather"])
async def get_weather_assessment(payload: WeatherRequest):
    result = weather_engine.fetch_and_assess(payload.latitude, payload.longitude)
    if result["status"] == "error":
        raise HTTPException(status_code=502, detail=result["assessment"])
    return result