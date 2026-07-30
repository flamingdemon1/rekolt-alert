import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  classifyDeviceAccuracy,
  parseApproximateIpLocation,
} from "../app/hooks/useLiveWeather";
import {
  getCurrentWeather,
  validateCoordinates,
} from "../app/backend/weather/weather.service";

test("IP location success keeps provider coordinates and labels approximation", () => {
  assert.deepEqual(
    parseApproximateIpLocation({
      latitude: -20.27,
      longitude: 57.37,
      city: "Flic-en-Flac",
      region: "Black River",
    }),
    {
      latitude: -20.27,
      longitude: 57.37,
      location: "Flic-en-Flac, Black River",
    },
  );
});

test("IP location failure is rejected instead of showing demo coordinates", () => {
  assert.throws(
    () => parseApproximateIpLocation({ error: true }),
    /invalid coordinates/,
  );
});

test("device accuracy is accepted and classified at all useful ranges", () => {
  assert.equal(classifyDeviceAccuracy(40), "precise");
  assert.equal(classifyDeviceAccuracy(500), "approximate");
  assert.equal(classifyDeviceAccuracy(2_500), "broad");
});

test("weather success uses the same latitude and longitude", async () => {
  const originalFetch = globalThis.fetch;
  const requestedUrls: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    requestedUrls.push(url);
    if (url.includes("open-meteo.com")) {
      return Response.json({
        current: {
          temperature_2m: 24,
          relative_humidity_2m: 82,
          precipitation: 0,
          weather_code: 1,
          wind_speed_10m: 14,
        },
      });
    }
    return Response.json({
      locality: "Flic-en-Flac",
      principalSubdivision: "Black River",
    });
  }) as typeof fetch;

  try {
    const result = await getCurrentWeather(-20.27, 57.37);
    assert.equal(result.location, "Flic-en-Flac, Black River");
    assert.equal(result.temperature, 24);
    assert.ok(
      requestedUrls.some(
        (url) =>
          url.includes("latitude=-20.27") &&
          url.includes("longitude=57.37"),
      ),
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("weather provider failure is surfaced", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => {
    if (String(input).includes("open-meteo.com")) {
      return new Response(null, { status: 503 });
    }
    return Response.json({});
  }) as typeof fetch;

  try {
    await assert.rejects(
      () => getCurrentWeather(-20.27, 57.37),
      /Weather provider is unavailable/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("invalid and reversed coordinate ranges are rejected", () => {
  assert.throws(() => validateCoordinates(120, 57.37));
  assert.throws(() => validateCoordinates(-20.27, 220));
});

test("live weather flow contains no hardcoded Bel Ombre or Savanne", async () => {
  const liveFiles = await Promise.all([
    readFile("app/hooks/useLiveWeather.ts", "utf8"),
    readFile("app/components/WeatherWidget.tsx", "utf8"),
    readFile("app/backend/weather/weather.service.ts", "utf8"),
  ]);
  const source = liveFiles.join("\n");
  assert.doesNotMatch(source, /Bel Ombre|Savanne/);
  assert.doesNotMatch(source, /MAX_LOCAL_ACCURACY|accuracy > 1_500/);
});
