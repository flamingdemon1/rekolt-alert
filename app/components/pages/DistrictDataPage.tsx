"use client";

import {
  AlertTriangle,
  ArrowLeft,
  ClipboardCheck,
  MapPinned,
  Radar,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import type { DistrictDataPage as DistrictDataPageModel } from "../../backend/pages/data.service";
import { useLanguage } from "../../context/LanguageContext";
import { copy } from "../../data/site-content";
import type { RiskLevel } from "../../types";
import { DistrictSilhouette } from "../DistrictSilhouette";
import { Footer } from "../Footer";
import { Header } from "../Header";

const issueIcons: Record<RiskLevel, typeof AlertTriangle> = {
  high: AlertTriangle,
  moderate: Radar,
  low: ShieldCheck,
};

/**
 * Presents one district on the left and its ordered issue list on the right.
 * All content arrives from the data service, keeping this component visual-only.
 */
export function DistrictDataPage({
  page,
}: {
  page: DistrictDataPageModel;
}) {
  const { language, setLanguage } = useLanguage();
  const { district, issues } = page;
  const labels = page.labels[language];
  const sharedCopy = copy[language];
  const districtName =
    language === "mfe" ? district.kreolName : district.officialName;

  return (
    <main
      className="inner-page district-data-page"
      data-district-data-page={district.id}
    >
      <div className="inner-page-header">
        <Header
          language={language}
          onLanguageChange={setLanguage}
          activePath={page.activePath}
        />
      </div>

      <section className="district-data-intro">
        <div>
          <Link className="back-link" href="/#district-map">
            <ArrowLeft size={17} />
            {labels.back}
          </Link>
          <span className="eyebrow light">{labels.eyebrow}</span>
          <h1>{districtName}</h1>
        </div>
      </section>

      <section className="district-data-layout">
        <aside className={`district-focus-card risk-${district.risk}`}>
          <DistrictSilhouette
            officialName={district.officialName}
            code={district.code}
            risk={district.risk}
          />

          <div className="district-focus-copy">
            <span className="district-focus-label">
              <MapPinned size={17} />
              {labels.overview}
            </span>
            <h2>{districtName}</h2>
            <span className={`risk-pill risk-${district.risk}`}>
              {sharedCopy.risk[district.risk]}
            </span>
          </div>

          <dl className="district-focus-facts">
            <div>
              <dt>{labels.currentRisk}</dt>
              <dd>{sharedCopy.risk[district.risk]}</dd>
            </div>
            <div>
              <dt>{labels.primarySignal}</dt>
              <dd>
                {language === "mfe" ? district.issueMfe : district.issueEn}
              </dd>
            </div>
            <div>
              <dt>{String(issues.length).padStart(2, "0")}</dt>
              <dd>{labels.monitoredSignals}</dd>
            </div>
          </dl>
        </aside>

        <div className="district-issues-column">
          <header className="district-issues-heading">
            <span className="eyebrow">{labels.eyebrow}</span>
            <h2>{labels.issuesTitle}</h2>
            <p>{labels.issuesIntro}</p>
          </header>

          <div className="district-issue-list">
            {issues.map((issue, index) => {
              const IssueIcon = issueIcons[issue.severity];

              return (
                <article
                  className={`district-issue-card risk-${issue.severity}`}
                  key={issue.id}
                >
                  <div className="district-issue-index">
                    <IssueIcon size={21} aria-hidden="true" />
                    <span>{String(index + 1).padStart(2, "0")}</span>
                  </div>
                  <div className="district-issue-copy">
                    <div className="district-issue-topline">
                      <span>{issue.category[language]}</span>
                      <strong>{sharedCopy.risk[issue.severity]}</strong>
                    </div>
                    <h3>{issue.title[language]}</h3>
                    <p>{issue.detail[language]}</p>
                    <div className="district-issue-action">
                      <ClipboardCheck size={18} aria-hidden="true" />
                      <div>
                        <span>{labels.recommendedAction}</span>
                        <p>{issue.action[language]}</p>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <p className="district-data-notice">{labels.demoNotice}</p>
        </div>
      </section>

      <Footer language={language} />
    </main>
  );
}
