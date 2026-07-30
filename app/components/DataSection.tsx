import { DatabaseZap } from "lucide-react";
import { copy } from "../data/site-content";
import type { Language } from "../types";

/** A dedicated data module explains geographic coverage and source integrity. */
export function DataSection({ language }: { language: Language }) {
  const content = copy[language];

  return (
    <section className="data-section" id="banne-done">
      <div className="data-orbit" aria-hidden="true">
        <span />
        <span />
        <span />
        <DatabaseZap size={38} />
      </div>

      <div className="data-copy">
        <span className="eyebrow light">{content.dataEyebrow}</span>
        <h2>{content.dataTitle}</h2>
        <p>{content.dataBody}</p>
      </div>

      <div className="data-stats">
        {content.dataStats.map(([value, label]) => (
          <div key={value}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
