import type { Metadata } from "next";
import { AboutPageExperience } from "../components/pages/AboutPageExperience";

export const metadata: Metadata = {
  title: "Lor nou",
  description:
    "Meet the five-person team behind Rekolt Alert and discover why we built local AI support for Mauritian farmers.",
};

/** A dedicated About experience keeps the richer team story isolated. */
export default function AboutPage() {
  return <AboutPageExperience />;
}
