import type { Metadata } from "next";
import { getAboutPage } from "../backend/pages/about.service";
import { SegmentPage } from "../components/pages/SegmentPage";

export const metadata: Metadata = { title: "Lor nou" };

/** About content lives in a small backend service that is easy to replace. */
export default async function AboutPage() {
  return <SegmentPage page={await getAboutPage()} />;
}
