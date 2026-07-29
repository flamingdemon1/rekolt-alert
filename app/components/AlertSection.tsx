"use client";

import { ArrowUpRight, Check, TriangleAlert } from "lucide-react";
import type { PointerEvent } from "react";
import { copy, districtRisks } from "../data/site-content";
import type { Language } from "../types";

type AlertSectionProps = {
  language: Language;
  selectedDistrict: string;
  onSelectDistrict: (districtId: string) => void;
};

/** Tilts a district card toward the pointer for a restrained 3D response. */
function tiltCard(event: PointerEvent<HTMLButtonElement>) {
  if (event.pointerType === "touch") return;

  const card = event.currentTarget;
  const bounds = card.getBoundingClientRect();
  const horizontal = (event.clientX - bounds.left) / bounds.width - 0.5;
  const vertical = (event.clientY - bounds.top) / bounds.height - 0.5;

  card.style.setProperty("--alert-tilt-x", `${vertical * -7}deg`);
  card.style.setProperty("--alert-tilt-y", `${horizontal * 9}deg`);
}

/** Returns the card to its resting angle when the pointer leaves. */
function resetCardTilt(event: PointerEvent<HTMLButtonElement>) {
  event.currentTarget.style.setProperty("--alert-tilt-x", "0deg");
  event.currentTarget.style.setProperty("--alert-tilt-y", "0deg");
}

/** All nine cards stay synced with the interactive map selection. */
export function AlertSection({
  language,
  selectedDistrict,
  onSelectDistrict,
}: AlertSectionProps) {
  const content = copy[language];

  return (
    <section className="content-section alert-section" id="alert">
      <div className="section-heading">
        <div>
          <span className="eyebrow">{content.alertsEyebrow}</span>
          <h2>{content.alertsTitle}</h2>
        </div>
        <p>{content.alertsBody}</p>
      </div>

      <div className="alert-layout">
        <div className="alert-grid">
          {districtRisks.map((district) => {
            const selected = district.id === selectedDistrict;
            const issue =
              language === "mfe" ? district.issueMfe : district.issueEn;

            return (
              <button
                className={`alert-card ${selected ? "selected" : ""}`}
                type="button"
                onClick={() => onSelectDistrict(district.id)}
                onPointerMove={tiltCard}
                onPointerLeave={resetCardTilt}
                aria-pressed={selected}
                key={district.id}
              >
                <span className="district-card-code">{district.code}</span>
                <strong>
                  {language === "mfe"
                    ? district.kreolName
                    : district.officialName}
                </strong>
                <span className={`risk-line risk-${district.risk}`}>
                  {district.risk === "low" ? (
                    <Check size={16} />
                  ) : (
                    <TriangleAlert size={16} />
                  )}
                  {content.risk[district.risk]}
                </span>
                <span className="issue-line">{issue}</span>
                <ArrowUpRight className="card-arrow" size={17} />
              </button>
            );
          })}
        </div>

        <aside className="harvest-feature">
          <div
            className="harvest-image"
            role="img"
            aria-label="Mauritian agricultural landscape"
          />
          <div>
            <span className="eyebrow light">{content.liveBadge}</span>
            <h3>{content.dataTitle}</h3>
            <p>{content.dataBody}</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
