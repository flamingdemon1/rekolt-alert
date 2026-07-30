import { BellRing, Camera, ScanSearch } from "lucide-react";
import { copy } from "../data/site-content";
import type { Language } from "../types";

const stepIcons = [Camera, ScanSearch, BellRing];

/** Three clear stages explain the product without adding dashboard complexity. */
export function HowItWorksSection({ language }: { language: Language }) {
  const content = copy[language];

  return (
    <section className="content-section how-section" id="kouma-li-marse">
      <div className="centered-heading">
        <span className="eyebrow">{content.howEyebrow}</span>
        <h2>{content.howTitle}</h2>
        <p>{content.howBody}</p>
      </div>

      <div className="steps-grid">
        {content.steps.map(([number, title, body], index) => {
          const Icon = stepIcons[index];

          return (
            <article className="step-card" key={number}>
              <span className="step-number">{number}</span>
              <span className="step-icon" aria-hidden="true">
                <Icon size={27} />
              </span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
