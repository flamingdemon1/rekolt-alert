import { copy } from "../../data/site-content";
import type { Language } from "../../types";
import type { LocalisedPageContent, SegmentPageData } from "./types";

/** Keeps resource article metadata separate from the page presentation. */
function localise(language: Language): LocalisedPageContent {
  const content = copy[language];

  return {
    eyebrow: content.resourceEyebrow,
    title: content.resourceTitle,
    body: content.resourceBody,
    cards: content.resourceCards.map(([title, duration, body], index) => ({
      kicker: String(index + 1).padStart(2, "0"),
      title,
      body,
      meta: duration,
    })),
  };
}

export async function getResourcesPage(): Promise<SegmentPageData> {
  return {
    activePath: "/resours",
    variant: "resources",
    content: {
      mfe: localise("mfe"),
      en: localise("en"),
    },
  };
}
