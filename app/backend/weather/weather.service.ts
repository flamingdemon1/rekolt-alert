export type CurrentWeather = {
  temperature: number;
  weatherCode: number;
  windSpeed: number;
  humidity: number;
  precipitation: number;
  assessment:
    | "critical-rain"
    | "warning-heat"
    | "warning-fungal"
    | "nominal";
  location: string | null;
};

/** Validates browser coordinates before they are sent to Open-Meteo. */
export function validateCoordinates(latitude: number, longitude: number) {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new RangeError("Invalid geographic coordinates");
  }
}

type ReverseGeocodeResponse = {
  locality?: string;
  city?: string;
  principalSubdivision?: string;
  countryName?: string;
  localityInfo?: {
    administrative?: Array<{
      name?: string;
      adminLevel?: number;
    }>;
  };
};

/** Converts GPS coordinates to a place label without exposing a browser CORS call. */
async function getLocationLabel(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  try {
    const parameters = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      localityLanguage: "en",
    });
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?${parameters}`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(5_000),
      },
    );
    if (!response.ok) return null;

    const data = (await response.json()) as ReverseGeocodeResponse;
    const detailedArea = data.localityInfo?.administrative
      ?.filter((area) => area.name && (area.adminLevel ?? 0) >= 8)
      .at(-1)?.name;
    // Prefer the named locality (for example Flic en Flac) over a broader
    // administrative area, which may only identify the surrounding district.
    const locality = data.locality || detailedArea || data.city;
    const region =
      data.principalSubdivision && data.principalSubdivision !== locality
        ? data.principalSubdivision
        : "";

    return (
      [locality, region || data.countryName].filter(Boolean).join(", ") ||
      null
    );
  } catch {
    // Weather should still render when the optional place-name service is down.
    return null;
  }
}

function assessWeather(
  temperature: number,
  humidity: number,
  precipitation: number,
): CurrentWeather["assessment"] {
  if (precipitation > 0.5) return "critical-rain";
  if (temperature > 35) return "warning-heat";
  if (humidity > 85 && temperature > 20) return "warning-fungal";
  return "nominal";
}

function requireWeatherNumber(
  value: unknown,
  field: string,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Weather provider omitted ${field}`);
  }
  return value;
}

/**
 * Server-side weather adapter. Keeping the provider call here makes the client
 * hook small and allows the weather provider to be swapped in one place.
 */
export async function getCurrentWeather(
  latitude: number,
  longitude: number,
): Promise<CurrentWeather> {
  validateCoordinates(latitude, longitude);

  const parameters = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    current:
      "temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m",
    timezone: "auto",
    forecast_days: "1",
  });
  const [response, location] = await Promise.all([
    fetch(`https://api.open-meteo.com/v1/forecast?${parameters}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    }),
    getLocationLabel(latitude, longitude),
  ]);

  if (!response.ok) {
    throw new Error("Weather provider is unavailable");
  }

  const data = (await response.json()) as {
    current?: Record<string, unknown>;
  };
  const current = data.current;
  if (!current) throw new Error("Weather provider returned no current data");

  const temperature = requireWeatherNumber(
    current.temperature_2m,
    "temperature",
  );
  const weatherCode = requireWeatherNumber(
    current.weather_code,
    "weather code",
  );
  const windSpeed = requireWeatherNumber(
    current.wind_speed_10m,
    "wind speed",
  );
  const humidity = requireWeatherNumber(
    current.relative_humidity_2m,
    "humidity",
  );
  const precipitation = requireWeatherNumber(
    current.precipitation,
    "precipitation",
  );

  return {
    temperature: Math.round(temperature),
    weatherCode: Math.round(weatherCode),
    windSpeed: Math.round(windSpeed),
    humidity: Math.round(humidity),
    precipitation: Math.round(precipitation * 10) / 10,
    assessment: assessWeather(temperature, humidity, precipitation),
    location,
  };
}
