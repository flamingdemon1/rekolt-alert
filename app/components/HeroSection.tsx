"use client";

import { Camera, Play } from "lucide-react";
import { copy } from "../data/site-content";
import type { Language } from "../types";
import { DistrictMap } from "./DistrictMap";

type HeroSectionProps = {
  language: Language;
  selectedDistrict: string;
  onSelectDistrict: (districtId: string) => void;
};

/** The first viewport closely follows the supplied composition and hierarchy. */
export function HeroSection({
  language,
  selectedDistrict,
  onSelectDistrict,
}: HeroSectionProps) {
  const content = copy[language];

  return (
    <section className="hero-section" id="akey">
      <div className="hero-backdrop" aria-hidden="true" />

      <div className="hero-content">
        <div className="hero-copy">
          <span className="hero-eyebrow">
            <i aria-hidden="true" />
            {content.heroEyebrow}
          </span>
          <h1>
            {content.heroTitle}
            <span>{content.heroAccent}</span>
          </h1>
          <p>{content.heroBody}</p>

          <div className="hero-actions">
            <a className="button primary-button" href="/check-plant">
              {content.primaryCta}
              <Camera size={19} />
            </a>
            <a className="button secondary-button" href="/kouma-li-marse">
              {content.secondaryCta}
              <span className="play-icon">
                <Play size={13} fill="currentColor" />
              </span>
            </a>
          </div>
        </div>

        <DistrictMap
          language={language}
          selectedDistrict={selectedDistrict}
          onSelectDistrict={onSelectDistrict}
        />
      </div>
    </section>
  );
}
