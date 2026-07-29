import { ArrowUpRight, PackageOpen, Sprout } from "lucide-react";
import { copy } from "../data/site-content";
import type { Language } from "../types";

/** Final split section keeps About and Shop modular without creating empty pages. */
export function AboutShopSection({ language }: { language: Language }) {
  const content = copy[language];

  return (
    <section className="about-shop-section">
      <article className="about-panel" id="lor-nou">
        <span className="panel-icon" aria-hidden="true">
          <Sprout size={25} />
        </span>
        <span className="eyebrow light">{content.aboutEyebrow}</span>
        <h2>{content.aboutTitle}</h2>
        <p>{content.aboutBody}</p>
      </article>

      <article className="shop-panel" id="magazin">
        <span className="panel-icon dark" aria-hidden="true">
          <PackageOpen size={25} />
        </span>
        <span className="eyebrow">{content.shopEyebrow}</span>
        <h2>{content.shopTitle}</h2>
        <p>{content.shopBody}</p>
        <a className="text-link" href="#akey">
          {content.shopCta}
          <ArrowUpRight size={18} />
        </a>
      </article>
    </section>
  );
}
