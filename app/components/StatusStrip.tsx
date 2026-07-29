"use client";

import { Languages, ShieldAlert, Sprout } from "lucide-react";
import { copy } from "../data/site-content";
import type { Language } from "../types";
import { WeatherWidget } from "./WeatherWidget";

/** Summary strip mirrors the reference while keeping weather genuinely live. */
export function StatusStrip({ language }: { language: Language }) {
  const content = copy[language];

  return (
    <section className="status-strip" aria-label="Current agricultural summary">
      <WeatherWidget language={language} />

      <div className="status-item">
        <span className="status-icon" aria-hidden="true">
          <ShieldAlert size={36} />
        </span>
        <div>
          <span className="status-label">{content.alertToday}</span>
          <strong>09</strong>
          <span className="status-meta">{content.alertSummary}</span>
        </div>
      </div>

      <div className="status-item">
        <span className="status-icon" aria-hidden="true">
          <Sprout size={38} />
        </span>
        <div>
          <span className="status-label">{content.popularPlants}</span>
          <strong>04</strong>
          <span className="status-meta">{content.popularList}</span>
        </div>
      </div>

      <div className="status-item">
        <span className="status-icon" aria-hidden="true">
          <Languages size={38} />
        </span>
        <div>
          <span className="status-label">{content.languages}</span>
          <strong>02</strong>
          <span className="status-meta">{content.languageList}</span>
        </div>
      </div>
    </section>
  );
}
