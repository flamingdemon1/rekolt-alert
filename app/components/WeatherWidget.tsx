"use client";

import {
  Cloud,
  CloudLightning,
  CloudRain,
  CloudSun,
  LocateFixed,
  Sun,
} from "lucide-react";
import { copy } from "../data/site-content";
import { useLiveWeather } from "../hooks/useLiveWeather";
import type { Language } from "../types";

type WeatherWidgetProps = {
  language: Language;
};

function WeatherIcon({ code }: { code: number }) {
  if (code === 0) return <Sun size={42} />;
  if (code <= 3) return <CloudSun size={42} />;
  if (code <= 48) return <Cloud size={42} />;
  if (code <= 67 || (code >= 80 && code <= 82)) return <CloudRain size={42} />;
  return <CloudLightning size={42} />;
}

function weatherLabel(code: number, language: Language) {
  const isKreol = language === "mfe";
  if (code === 0) return isKreol ? "Soley" : "Clear";
  if (code <= 3) return isKreol ? "Enpe niaz" : "Partly cloudy";
  if (code <= 48) return isKreol ? "Niaz" : "Cloudy";
  if (code <= 67) return isKreol ? "Lapli" : "Rain";
  if (code <= 82) return isKreol ? "Gro lapli" : "Rain showers";
  return isKreol ? "Loraz" : "Thunderstorm";
}

function assessmentLabel(
  assessment:
    | "critical-rain"
    | "warning-heat"
    | "warning-fungal"
    | "nominal",
  language: Language,
) {
  const isKreol = language === "mfe";
  if (assessment === "critical-rain") {
    return isKreol
      ? "Alert: lapli for kapav afekte karo."
      : "Alert: heavy rain may affect fields.";
  }
  if (assessment === "warning-heat") {
    return isKreol
      ? "Alert saler: verifye irigasion."
      : "Heat alert: check irrigation.";
  }
  if (assessment === "warning-fungal") {
    return isKreol
      ? "Risk sanpignon avek sa imidite-la."
      : "Fungal risk in the current humidity.";
  }
  return isKreol
    ? "Kondision agrikol stab."
    : "Agricultural conditions are stable.";
}

function formatAccuracy(accuracy: number) {
  if (accuracy >= 1_000) return `${(accuracy / 1_000).toFixed(1)} km`;
  return `${accuracy} m`;
}

/** Compact live-weather readout used inside the green status ribbon. */
export function WeatherWidget({ language }: WeatherWidgetProps) {
  const content = copy[language];
  const { weather, requestLocation, requestApproximateLocation } =
    useLiveWeather();
  const isLoading = weather.status === "loading";
  const isReady = weather.status === "ready";
  const canRequest = !isReady && !isLoading;
  const canUseIpEstimate =
    weather.status === "permission-denied" ||
    weather.status === "inaccurate" ||
    weather.status === "unsupported" ||
    weather.status === "error";
  const location = weather.location || content.weatherFallback;
  const sourceLabel =
    weather.source === "device"
      ? content.weatherDeviceSource
      : weather.source === "device-approximate"
        ? content.weatherApproximateSource
        : content.weatherIpSource;
  const statusMessage =
    weather.status === "idle"
      ? content.weatherIdle
      : weather.status === "permission-denied"
        ? content.weatherDenied
        : weather.status === "inaccurate"
          ? `${content.weatherInaccurate}${
            weather.accuracy
              ? ` (${formatAccuracy(weather.accuracy)})`
              : ""
          }`
        : weather.status === "unsupported"
          ? content.weatherUnsupported
          : content.weatherError;
  const accuracyLabel =
    weather.accuracy === null
      ? content.weatherIpSource
      : `${sourceLabel} ±${weather.accuracy} m`;

  return (
    <div className="status-item weather-item">
      <span className="status-icon weather-icon" aria-hidden="true">
        <WeatherIcon code={weather.weatherCode} />
      </span>
      <div>
        <span className="status-label">{content.weatherTitle}</span>
        <strong>{isReady ? `${weather.temperature}°C` : "—"}</strong>
        <span
          className="status-meta"
          title={
            isReady
              ? `${location} · ${accuracyLabel} · ${assessmentLabel(
                weather.assessment,
                language,
              )}`
              : undefined
          }
        >
          {isLoading
            ? content.weatherLoading
            : isReady
              ? `${location} · ${weatherLabel(
                weather.weatherCode,
                language,
              )}`
              : statusMessage}
        </span>
        {isReady && (
          <span
            className={`weather-details assessment-${weather.assessment}`}
            title={assessmentLabel(weather.assessment, language)}
          >
            {content.weatherHumidity} {weather.humidity}% ·{" "}
            {content.weatherRain} {weather.precipitation} mm
            <b>{sourceLabel}</b>
          </span>
        )}
        {canRequest && (
          <span className="weather-actions">
            <button
              className="weather-location-action"
              type="button"
              onClick={requestLocation}
            >
              <LocateFixed size={15} />
              {content.weatherRetry}
            </button>
            {canUseIpEstimate && (
              <button
                className="weather-location-action weather-location-secondary"
                type="button"
                onClick={requestApproximateLocation}
              >
                {content.weatherApproximateAction}
              </button>
            )}
          </span>
        )}
      </div>
      {isReady && weather.source !== "device" && (
        <button
          className="location-retry"
          type="button"
          onClick={requestLocation}
          title={content.weatherExactRetry}
          aria-label={content.weatherExactRetry}
        >
          <LocateFixed size={17} />
        </button>
      )}
    </div>
  );
}
