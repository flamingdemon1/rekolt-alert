"use client";

import { geoContains } from "d3-geo";
import { useCallback, useEffect, useRef, useState } from "react";
import districtGeoJson from "../data/mauritius-districts.json";

type WeatherStatus =
  | "idle"
  | "loading"
  | "ready"
  | "permission-denied"
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

export type ApproximateIpLocation = {
  latitude: number;
  longitude: number;
  location: string | null;
};

const TARGET_ACCURACY_METERS = 250;

export type DeviceAccuracyKind = "precise" | "approximate" | "broad";

/** Classify browser accuracy without rejecting a usable location. */
export function classifyDeviceAccuracy(
  accuracyMeters: number,
): DeviceAccuracyKind {
  if (accuracyMeters < 100) return "precise";
  if (accuracyMeters <= 1_000) return "approximate";
  return "broad";
}

/** Validate an IP provider result before it can affect displayed weather. */
export function parseApproximateIpLocation(
  data: IpLocationResponse,
): ApproximateIpLocation {
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
    let lastError: GeolocationPositionError | Error | null = null;
    let watchId: number | null = null;
    let settleTimer: number | null = null;
    let finished = false;

    const cleanup = () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      if (settleTimer !== null) window.clearTimeout(settleTimer);
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
      else {
        finish({
          error:
            lastError ?? new Error("No device location was received"),
        });
      }
    }, 10_000);

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
          return;
        }

        // A laptop may only provide Wi-Fi accuracy. Give it a brief chance to
        // improve, then use the best reading instead of looking frozen.
        if (settleTimer === null) {
          settleTimer = window.setTimeout(() => {
            if (bestPosition) finish({ position: bestPosition });
          }, 1_500);
        }
      },
      (error) => {
        // Permission errors cannot improve by waiting for another reading.
        if (error.code === error.PERMISSION_DENIED) {
          finish({ error });
          return;
        }
        lastError = error;
      },
      {
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 0,
      },
    );
  });
}

/**
 * IP geolocation identifies an internet-provider area, not the physical device.
 * It is used for the initial, clearly labelled approximate weather reading.
 */
async function getApproximateIpLocation() {
  const response = await fetchWithTimeout("https://ipapi.co/json/", 7_000);
  if (!response.ok) throw new Error("IP location provider unavailable");

  const data = (await response.json()) as IpLocationResponse;
  return parseApproximateIpLocation(data);
}

/**
 * Browser-native weather flow:
 * 1. an automatic, clearly labelled IP approximation;
 * 2. user-approved device position, including coarse laptop readings;
 * 3. weather for those exact coordinates;
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
  const initialLocationStartedRef = useRef(false);

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

      await loadWeather({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy,
        source:
          classifyDeviceAccuracy(accuracy) === "precise"
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

    const loadInitialLocation = async () => {
      if (initialLocationStartedRef.current) return;
      initialLocationStartedRef.current = true;

      if (!navigator.geolocation) {
        if (active) void requestApproximateLocation();
        return;
      }

      if (!navigator.permissions?.query) {
        if (active) void requestApproximateLocation();
        return;
      }

      try {
        const permission = await navigator.permissions.query({
          name: "geolocation",
        });
        if (!active) return;

        if (permission.state === "granted") {
          void requestLocation();
        } else {
          void requestApproximateLocation();
        }
      } catch {
        if (active) void requestApproximateLocation();
      }
    };

    void loadInitialLocation();
    return () => {
      active = false;
    };
  }, [requestApproximateLocation, requestLocation]);

  return { weather, requestLocation, requestApproximateLocation };
}
