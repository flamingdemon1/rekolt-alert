from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

# 1. Import your secure settings profile and errors from your assigned scope
from backend.app.config import settings
from backend.app.errors import GemmaPipelineException, gemma_exception_handler, general_http_exception_handler
from backend.app.tools.weather_tool import GeoWeatherEngine

# 2. Initialize the core FastAPI app instance
app = FastAPI(title=settings.PROJECT_NAME)

# 3. Register global exception handlers
app.add_exception_handler(GemmaPipelineException, gemma_exception_handler)
app.add_exception_handler(HTTPException, general_http_exception_handler)

# 4. Define the incoming request data structure
class WeatherRequest(BaseModel):
    latitude: float
    longitude: float

# 5. Instantiate the standalone core weather engine
weather_engine = GeoWeatherEngine()

# 6. Expose the route directly on the core app instance
@app.post(f"{settings.API_V1_STR}/weather", tags=["Weather"])
async def get_weather_assessment(payload: WeatherRequest):
    result = weather_engine.fetch_and_assess(payload.latitude, payload.longitude)
    if result["status"] == "error":
        raise HTTPException(status_code=502, detail=result["assessment"])
    return result