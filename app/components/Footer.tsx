import { Sprout } from "lucide-react";
import Link from "next/link";
import { copy } from "../data/site-content";
import type { Language } from "../types";

/** Footer includes the demo disclaimer and authoritative district-data credit. */
export function Footer({ language }: { language: Language }) {
  const content = copy[language];

  return (
    <footer className="site-footer">
      <Link className="brand footer-brand" href="/">
        <span className="brand-mark" aria-hidden="true">
          <Sprout size={23} />
        </span>
        <span>Rekolt Alert</span>
      </Link>
      <p>{content.footerNote}</p>
      <a
        href="https://data.govmu.org/dataset/mauritius-districts"
        target="_blank"
        rel="noreferrer"
      >
        District data · Mauritius Open Data
      </a>
    </footer>
  );
}
