import type { Metadata } from "next";
import { CheckPlantPage } from "../components/pages/CheckPlantPage";

export const metadata: Metadata = {
  title: "Dokter Plant",
  description:
    "Chat with the Rekolt Alert plant assistant using text, voice and photos.",
};

/** The route delegates the conversation and backend work to focused modules. */
export default function PlantCheckRoute() {
  return <CheckPlantPage />;
}
