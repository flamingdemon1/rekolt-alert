import type { Metadata } from "next";
import { getResourcesPage } from "../backend/pages/resources.service";
import { SegmentPage } from "../components/pages/SegmentPage";

export const metadata: Metadata = { title: "Resours" };

/** Resource cards are loaded independently from their visual layout. */
export default async function ResourcesPage() {
  return <SegmentPage page={await getResourcesPage()} />;
}
