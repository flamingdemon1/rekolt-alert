import type { Language, RiskLevel } from "../../types";

export type PlantSymptom =
  | "spots"
  | "yellowing"
  | "holes"
  | "powder"
  | "wilting"
  | "insects";

export type PlantCheckInput = {
  crop: string;
  symptoms: PlantSymptom[];
  notes: string;
  image: File;
};

export type PlantCheckResult = {
  id: string;
  crop: string;
  risk: RiskLevel;
  imageName: string;
  finding: Record<Language, string>;
  actions: Record<Language, string[]>;
  disclaimer: Record<Language, string>;
};
