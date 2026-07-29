import { ArrowUpRight, BookOpen, CloudRain, CalendarDays } from "lucide-react";
import { copy } from "../data/site-content";
import type { Language } from "../types";

const resourceIcons = [BookOpen, CloudRain, CalendarDays];

/** Editorial resource cards give the Resources navigation a useful destination. */
export function ResourcesSection({ language }: { language: Language }) {
  const content = copy[language];

  return (
    <section className="content-section resources-section" id="resours">
      <div className="section-heading">
        <div>
          <span className="eyebrow">{content.resourceEyebrow}</span>
          <h2>{content.resourceTitle}</h2>
        </div>
        <p>{content.resourceBody}</p>
      </div>

      <div className="resource-grid">
        {content.resourceCards.map(([title, duration, body], index) => {
          const Icon = resourceIcons[index];

          return (
            <article className="resource-card" key={title}>
              <span className="resource-icon" aria-hidden="true">
                <Icon size={25} />
              </span>
              <span className="read-time">{duration}</span>
              <h3>{title}</h3>
              <p>{body}</p>
              <ArrowUpRight size={19} aria-hidden="true" />
            </article>
          );
        })}
      </div>
    </section>
  );
}
