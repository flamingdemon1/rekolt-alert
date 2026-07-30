import type { Language } from "../../types";

export type PageCard = {
  kicker: string;
  title: string;
  body: string;
  meta?: string;
};

export type PageMetric = {
  value: string;
  label: string;
};

export type LocalisedPageContent = {
  eyebrow: string;
  title: string;
  body: string;
  cards: PageCard[];
  metrics?: PageMetric[];
};

/** Common backend contract consumed by every separated navigation page. */
export type SegmentPageData = {
  activePath: string;
  variant: "steps" | "data" | "resources" | "about" | "shop";
  content: Record<Language, LocalisedPageContent>;
};
