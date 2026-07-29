import { getCurrentWeather } from "../../backend/weather/weather.service";

/** Returns weather only for the coordinates supplied by the current browser. */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const latitudeValue = url.searchParams.get("latitude");
    const longitudeValue = url.searchParams.get("longitude");
    if (latitudeValue === null || longitudeValue === null) {
      throw new RangeError("Missing geographic coordinates");
    }
    const latitude = Number(latitudeValue);
    const longitude = Number(longitudeValue);
    const weather = await getCurrentWeather(latitude, longitude);

    return Response.json(weather, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const invalidCoordinates = error instanceof RangeError;

    return Response.json(
      {
        error: invalidCoordinates
          ? "Valid latitude and longitude are required."
          : "Current weather is temporarily unavailable.",
      },
      { status: invalidCoordinates ? 400 : 502 },
    );
  }
}
