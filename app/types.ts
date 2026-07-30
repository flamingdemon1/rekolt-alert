/** Shared UI types keep translations and risk data consistent across modules. */
export type Language = "mfe" | "en";
export type RiskLevel = "high" | "moderate" | "low";

export type DistrictRisk = {
  id: string;
  officialName: string;
  kreolName: string;
  code: string;
  risk: RiskLevel;
  issueMfe: string;
  issueEn: string;
};
