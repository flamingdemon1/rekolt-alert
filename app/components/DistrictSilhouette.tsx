"use client";

import { geoMercator, geoPath } from "d3-geo";
import { useMemo } from "react";
import districtGeoJson from "../data/mauritius-districts.json";
import type { RiskLevel } from "../types";

type DistrictSilhouetteProps = {
  officialName: string;
  code: string;
  risk: RiskLevel;
};

/**
 * Reprojects one official district polygon so its real outline fills the Data
 * card. The face shares a transition name with the selected homepage polygon.
 */
export function DistrictSilhouette({
  officialName,
  code,
  risk,
}: DistrictSilhouetteProps) {
  const geometry = useMemo(() => {
    const feature = districtGeoJson.features.find(
      ({ properties }) => properties.name === officialName,
    );

    if (!feature) return null;

    const projection = geoMercator().fitExtent(
      [
        [34, 24],
        [286, 266],
      ],
      feature as never,
    );
    const path = geoPath(projection);
    const centroid = path.centroid(feature as never);

    return {
      path: path(feature as never) ?? "",
      centroid: centroid.map((value) =>
        Number(value.toFixed(3)),
      ) as [number, number],
    };
  }, [officialName]);

  if (!geometry) return null;

  return (
    <div className="district-focus-orbit" aria-hidden="true">
      <svg
        className="district-focus-map"
        viewBox="0 0 320 290"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="focus-high" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffd83d" />
            <stop offset="1" stopColor="#f0a900" />
          </linearGradient>
          <linearGradient id="focus-moderate" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#a8d954" />
            <stop offset="1" stopColor="#5fa94a" />
          </linearGradient>
          <linearGradient id="focus-low" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#3b9d6d" />
            <stop offset="1" stopColor="#166043" />
          </linearGradient>
        </defs>

        <path
          className="district-focus-depth"
          d={geometry.path}
          aria-hidden="true"
        />
        <path
          className={`district-focus-shape risk-${risk}`}
          d={geometry.path}
          fill={`url(#focus-${risk})`}
        />
        <text
          className="district-focus-code"
          x={geometry.centroid[0]}
          y={geometry.centroid[1]}
        >
          {code}
        </text>
      </svg>
    </div>
  );
}
