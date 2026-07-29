import { copy } from "../../data/site-content";
import type { Language } from "../../types";
import type { LocalisedPageContent, SegmentPageData } from "./types";

/** Builds the How it works page data independently from its visual component. */
function localise(language: Language): LocalisedPageContent {
  const content = copy[language];

  return {
    eyebrow: content.howEyebrow,
    title: content.howTitle,
    body: content.howBody,
    cards: content.steps.map(([number, title, body]) => ({
      kicker: number,
      title,
      body,
    })),
  };
}

export async function getHowItWorksPage(): Promise<SegmentPageData> {
  return {
    activePath: "/kouma-li-marse",
    variant: "steps",
    content: {
      mfe: localise("mfe"),
      en: localise("en"),
    },
  };
}
