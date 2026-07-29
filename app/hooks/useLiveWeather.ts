"use client";

import { geoContains } from "d3-geo";
import { useCallback, useEffect, useState } from "react";
import districtGeoJson from "../data/mauritius-districts.json";

type WeatherStatus =
  | "idle"
  | "loading"
  | "ready"
  | "permission-denied"
  | "inaccurate"
  | "unsupported"
  | "error";

type LocationSource = "device" | "device-approximate" | "ip";

type WeatherAssessment =
  | "critical-rain"
  | "warning-heat"
  | "warning-fungal"
  | "nominal";

type WeatherState = {
  status: WeatherStatus;
  temperature: number;
  weatherCode: number;
  windSpeed: number;
  humidity: number;
  precipitation: number;
  assessment: WeatherAssessment;
  location: string;
  accuracy: number | null;
  source: LocationSource | null;
};

type WeatherResponse = {
  temperature: number;
  weatherCode: number;
  windSpeed: number;
  humidity: number;
  precipitation: number;
  assessment: WeatherAssessment;
  location?: string | null;
};

type IpLocationResponse = {
  latitude?: number;
  longitude?: number;
  city?: string;
  region?: string;
  country_name?: string;
  error?: boolean;
};

// A wider reading can point to another town, so it is not accepted as local.
const MAX_LOCAL_ACCURACY_METERS = 1_500;
const TARGET_ACCURACY_METERS = 250;

/** Finds a Mauritius district when reverse geocoding is temporarily unavailable. */
function findMauritiusDistrict(longitude: number, latitude: number) {
  const district = districtGeoJson.features.find((feature) =>
    geoContains(feature as never, [longitude, latitude]),
  );

  return district?.properties.name;
}

/** Prevents a third-party request from leaving the homepage stuck on loading. */
async function fetchWithTimeout(
  input: RequestInfo | URL,
  timeout: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeout);

  try {
    return await fetch(input, {
      signal: controller.signal,
      cache: "no-store",
    });
  } finally {
    window.clearTimeout(timer);
  }
}

function permissionWasDenied(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 1
  );
}

/**
 * Collects device readings briefly and keeps the one with the smallest
 * reported accuracy radius. This prevents an early, coarse Wi-Fi reading from
 * winning when the browser can provide a better position moments later.
 */
function readBestBrowserPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    let bestPosition: GeolocationPosition | null = null;
    let watchId: number | null = null;
    let finished = false;

    const cleanup = () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      window.clearTimeout(deadline);
    };
    const finish = (
      result:
        | { position: GeolocationPosition }
        | { error: GeolocationPositionError | Error },
    ) => {
      if (finished) return;
      finished = true;
      cleanup();
      if ("position" in result) resolve(result.position);
      else reject(result.error);
    };
    const deadline = window.setTimeout(() => {
      if (bestPosition) finish({ position: bestPosition });
      else finish({ error: new Error("No device location was received") });
    }, 15_000);

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (
          !bestPosition ||
          position.coords.accuracy < bestPosition.coords.accuracy
        ) {
          bestPosition = position;
        }

        if (position.coords.accuracy <= TARGET_ACCURACY_METERS) {
          finish({ position });
        }
      },
      (error) => {
        // Permission errors cannot improve by waiting for another reading.
        if (error.code === error.PERMISSION_DENIED || !bestPosition) {
          finish({ error });
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15_000,
        maximumAge: 0,
      },
    );
  });
}

/**
 * IP geolocation identifies an internet-provider area, not the physical device.
 * It is offered only after the visitor explicitly asks for an approximation.
 */
async function getApproximateIpLocation() {
  const response = await fetchWithTimeout("https://ipapi.co/json/", 7_000);
  if (!response.ok) throw new Error("IP location provider unavailable");

  const data = (await response.json()) as IpLocationResponse;
  const latitude = Number(data.latitude);
  const longitude = Number(data.longitude);
  if (
    data.error ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    throw new Error("IP location provider returned invalid coordinates");
  }

  return {
    latitude,
    longitude,
    location:
      [data.city, data.region || data.country_name].filter(Boolean).join(", ") ||
      null,
  };
}

/**
 * Browser-native weather flow:
 * 1. user-approved device position with an accuracy check;
 * 2. weather for those exact coordinates;
 * 3. optional, clearly labelled IP approximation only when manually requested.
 */
export function useLiveWeather() {
  const [weather, setWeather] = useState<WeatherState>({
    status: "idle",
    temperature: 0,
    weatherCode: 1,
    windSpeed: 0,
    humidity: 0,
    precipitation: 0,
    assessment: "nominal",
    location: "",
    accuracy: null,
    source: null,
  });

  const loadWeather = useCallback(
    async ({
      latitude,
      longitude,
      accuracy,
      source,
      locationHint,
    }: {
      latitude: number;
      longitude: number;
      accuracy: number | null;
      source: LocationSource;
      locationHint?: string | null;
    }) => {
      try {
        const parameters = new URLSearchParams({
          latitude: latitude.toString(),
          longitude: longitude.toString(),
        });
        const response = await fetchWithTimeout(
          `/api/weather?${parameters}`,
          12_000,
        );
        if (!response.ok) throw new Error("Weather service unavailable");

        const data = (await response.json()) as WeatherResponse;
        const district = findMauritiusDistrict(longitude, latitude);

        setWeather({
          status: "ready",
          temperature: data.temperature,
          weatherCode: data.weatherCode,
          windSpeed: data.windSpeed,
          humidity: data.humidity,
          precipitation: data.precipitation,
          assessment: data.assessment,
          location: data.location || locationHint || district || "",
          accuracy:
            accuracy === null ? null : Math.max(1, Math.round(accuracy)),
          source,
        });
        return true;
      } catch {
        setWeather((current) => ({ ...current, status: "error" }));
        return false;
      }
    },
    [],
  );

  const requestApproximateLocation = useCallback(
    async () => {
      setWeather((current) => ({ ...current, status: "loading" }));

      try {
        const approximate = await getApproximateIpLocation();
        await loadWeather({
          ...approximate,
          accuracy: null,
          source: "ip",
          locationHint: approximate.location,
        });
      } catch {
        setWeather((current) => ({ ...current, status: "error" }));
      }
    },
    [loadWeather],
  );

  const requestLocation = useCallback(async () => {
    setWeather((current) => ({ ...current, status: "loading" }));

    if (!navigator.geolocation) {
      setWeather((current) => ({ ...current, status: "unsupported" }));
      return;
    }

    try {
      const position = await readBestBrowserPosition();
      const accuracy = Math.max(1, Math.round(position.coords.accuracy));

      if (accuracy > MAX_LOCAL_ACCURACY_METERS) {
        setWeather((current) => ({
          ...current,
          status: "inaccurate",
          accuracy,
          source: "device-approximate",
        }));
        return;
      }

      await loadWeather({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy,
        source:
          accuracy <= TARGET_ACCURACY_METERS
            ? "device"
            : "device-approximate",
      });
    } catch (error) {
      if (permissionWasDenied(error)) {
        setWeather((current) => ({
          ...current,
          status: "permission-denied",
        }));
        return;
      }
      setWeather((current) => ({ ...current, status: "error" }));
    }
  }, [loadWeather]);

  useEffect(() => {
    let active = true;

    const restoreExistingPermission = async () => {
      if (!navigator.geolocation) {
        if (active) {
          setWeather((current) => ({
            ...current,
            status: "unsupported",
          }));
        }
        return;
      }

      if (!navigator.permissions?.query) return;

      try {
        const permission = await navigator.permissions.query({
          name: "geolocation",
        });
        if (!active) return;

        if (permission.state === "granted") {
          void requestLocation();
        } else if (permission.state === "denied") {
          setWeather((current) => ({
            ...current,
            status: "permission-denied",
          }));
        }
      } catch {
        // Browsers without Permissions API support keep the explicit button.
      }
    };

    void restoreExistingPermission();
    return () => {
      active = false;
    };
  }, [requestLocation]);

  return { weather, requestLocation, requestApproximateLocation };
}
