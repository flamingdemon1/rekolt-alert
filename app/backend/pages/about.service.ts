import { copy } from "../../data/site-content";
import type { SegmentPageData } from "./types";

/** Provides the About page values without coupling them to the UI layout. */
export async function getAboutPage(): Promise<SegmentPageData> {
  return {
    activePath: "/lor-nou",
    variant: "about",
    content: {
      mfe: {
        eyebrow: copy.mfe.aboutEyebrow,
        title: copy.mfe.aboutTitle,
        body: copy.mfe.aboutBody,
        cards: [
          {
            kicker: "01",
            title: "Langaz ki kler",
            body: "Kreol Morisien an premie pou fer informasion vinn pli fasil lor terin.",
          },
          {
            kicker: "02",
            title: "Done par distrik",
            body: "Enn vizion lokal lor risk, meteo ek bann signal ki konsern planter.",
          },
          {
            kicker: "03",
            title: "Fer pou telefonn",
            body: "Enn lexperyans rapid ek aksesib mem kan ou pe travay dan karo.",
          },
        ],
      },
      en: {
        eyebrow: copy.en.aboutEyebrow,
        title: copy.en.aboutTitle,
        body: copy.en.aboutBody,
        cards: [
          {
            kicker: "01",
            title: "Clear local language",
            body: "Kreol Morisien comes first so field information remains easy to understand.",
          },
          {
            kicker: "02",
            title: "District-level data",
            body: "A local view of risks, weather and signals that matter to growers.",
          },
          {
            kicker: "03",
            title: "Designed for mobile",
            body: "A fast, accessible experience while working in the field.",
          },
        ],
      },
    },
  };
}
