"use client";

import { ArrowLeft, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "../../context/LanguageContext";
import type { SegmentPageData } from "../../backend/pages/types";
import { Footer } from "../Footer";
import { Header } from "../Header";

/**
 * Shared page frame keeps navigation and typography visually identical while
 * each route receives its own independent backend content module.
 */
export function SegmentPage({ page }: { page: SegmentPageData }) {
  const { language, setLanguage } = useLanguage();
  const content = page.content[language];

  return (
    <main className={`inner-page inner-page-${page.variant}`}>
      <div className="inner-page-header">
        <Header
          language={language}
          onLanguageChange={setLanguage}
          activePath={page.activePath}
        />
      </div>

      <section className="inner-page-hero">
        <div>
          <Link className="back-link" href="/">
            <ArrowLeft size={17} />
            {language === "mfe" ? "Retour Akey" : "Back home"}
          </Link>
          <span className="eyebrow light">{content.eyebrow}</span>
          <h1>{content.title}</h1>
          <p>{content.body}</p>
        </div>
      </section>

      {content.metrics && (
        <section className="page-metrics" aria-label="Page summary">
          {content.metrics.map((metric) => (
            <div key={metric.value}>
              <strong>{metric.value}</strong>
              <span>{metric.label}</span>
            </div>
          ))}
        </section>
      )}

      <section className={`page-card-grid page-card-grid-${page.variant}`}>
        {content.cards.map((card) => (
          <article className="page-feature-card" key={`${card.kicker}-${card.title}`}>
            <div className="page-card-topline">
              <span>{card.kicker}</span>
              {card.meta && <strong>{card.meta}</strong>}
            </div>
            <h2>{card.title}</h2>
            <p>{card.body}</p>
            <ArrowUpRight size={19} aria-hidden="true" />
          </article>
        ))}
      </section>

      <Footer language={language} />
    </main>
  );
}
