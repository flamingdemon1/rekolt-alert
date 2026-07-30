import type { Metadata } from "next";
import { HowItWorksExperience } from "../components/pages/HowItWorksExperience";

export const metadata: Metadata = {
  title: "Kouma li marse",
  description:
    "Follow a crop concern through Rekolt Alert, from the farmer's first message to practical guidance.",
};

export default function HowItWorksPage() {
  return <HowItWorksExperience />;
}
