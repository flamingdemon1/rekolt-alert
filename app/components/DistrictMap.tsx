"use client";

import { geoMercator, geoPath } from "d3-geo";
import { useMemo } from "react";
import districtGeoJson from "../data/mauritius-districts.json";
import { copy, districtRisks } from "../data/site-content";
import type { Language, RiskLevel } from "../types";

type DistrictMapProps = {
  language: Language;
  selectedDistrict: string;
  onSelectDistrict: (districtId: string) => void;
};

const riskOrder: Record<RiskLevel, number> = {
  low: 0,
  moderate: 1,
  high: 2,
};

/**
 * Projects the official nine-district polygons into one compact SVG. CSS gives
 * every polygon depth while the underlying geographic geometry stays intact.
 */
export function DistrictMap({
  language,
  selectedDistrict,
  onSelectDistrict,
}: DistrictMapProps) {
  const content = copy[language];

  const mappedDistricts = useMemo(() => {
    const projection = geoMercator().fitExtent(
      [
        [34, 18],
        [356, 432],
      ],
      districtGeoJson as never,
    );
    const path = geoPath(projection);

    return districtGeoJson.features
      .map((feature) => {
        const risk = districtRisks.find(
          (district) => district.officialName === feature.properties.name,
        );

        if (!risk) return null;

        const centroid = path.centroid(feature as never);

        return {
          feature,
          risk,
          path: path(feature as never) ?? "",
          // Fixed precision prevents tiny server/browser math differences
          // from creating a React hydration warning on SVG text positions.
          centroid: centroid.map((value) =>
            Number(value.toFixed(3)),
          ) as [number, number],
        };
      })
      .filter(Boolean) as Array<{
      feature: (typeof districtGeoJson.features)[number];
      risk: (typeof districtRisks)[number];
      path: string;
      centroid: [number, number];
    }>;
  }, []);

  const activeDistrict =
    districtRisks.find((district) => district.id === selectedDistrict) ??
    districtRisks[0];

  const selectWithKeyboard = (
    event: React.KeyboardEvent<SVGGElement>,
    districtId: string,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelectDistrict(districtId);
    }
  };

  return (
    <div className="district-map-card" id="district-map">
      <div className="map-card-heading">
        <div>
          <span className="eyebrow light">{content.mapEyebrow}</span>
          <h2>{content.mapTitle}</h2>
        </div>
        <span className="map-live-indicator">
          <i aria-hidden="true" />
          {content.liveBadge}
        </span>
      </div>

      <div className="map-stage">
        <svg
          className="district-map"
          viewBox="0 0 390 450"
          role="img"
          aria-label="Interactive map of the nine districts of Mauritius"
        >
          <defs>
            <linearGradient id="district-high" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ffd83d" />
              <stop offset="1" stopColor="#f0a900" />
            </linearGradient>
            <linearGradient id="district-moderate" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#a8d954" />
              <stop offset="1" stopColor="#5fa94a" />
            </linearGradient>
            <linearGradient id="district-low" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#3b9d6d" />
              <stop offset="1" stopColor="#166043" />
            </linearGradient>
          </defs>

          {mappedDistricts.map(({ path, risk }) => {
            const selected = risk.id === selectedDistrict;
            const displayName =
              language === "mfe" ? risk.kreolName : risk.officialName;

            return (
              <g
                className={`district-shape-group risk-${risk.risk} ${
                  selected ? "selected" : ""
                }`}
                role="button"
                tabIndex={0}
                aria-label={`${displayName}: ${content.risk[risk.risk]}. ${
                  language === "mfe"
                    ? "Ouver done distrik"
                    : "Open district data"
                }`}
                aria-pressed={selected}
                onClick={() => onSelectDistrict(risk.id)}
                onKeyDown={(event) => selectWithKeyboard(event, risk.id)}
                key={risk.id}
              >
                <path className="district-depth" d={path} aria-hidden="true" />
                <path
                  className={`district-face ${
                    selected ? "district-morph-shape" : ""
                  }`}
                  d={path}
                />
              </g>
            );
          })}

          {mappedDistricts.map(({ centroid, risk }) => (
            <text
              className={`district-code ${
                risk.id === selectedDistrict ? "selected" : ""
              }`}
              x={centroid[0]}
              y={centroid[1]}
              aria-hidden="true"
              key={`${risk.id}-label`}
            >
              {risk.code}
            </text>
          ))}
        </svg>
      </div>

      <div className="selected-district-panel" aria-live="polite">
        <div>
          <span>{content.mapHint}</span>
          <strong>
            {language === "mfe"
              ? activeDistrict.kreolName
              : activeDistrict.officialName}
          </strong>
        </div>
        <span
          className={`risk-pill risk-${activeDistrict.risk}`}
          data-risk-order={riskOrder[activeDistrict.risk]}
        >
          {content.risk[activeDistrict.risk]}
        </span>
      </div>

      <small>{content.mapSource}</small>
    </div>
  );
}
