import type { Metadata } from "next";
import { getHowItWorksPage } from "../backend/pages/how-it-works.service";
import { SegmentPage } from "../components/pages/SegmentPage";

export const metadata: Metadata = { title: "Kouma li marse" };

/** Route stays simple: backend content and page presentation remain separated. */
export default async function HowItWorksPage() {
  return <SegmentPage page={await getHowItWorksPage()} />;
}
