import type { Language, RiskLevel } from "../../types";

export type PlantChatInput = {
  prompt: string;
  attachments: File[];
};

export type PlantChatReply = {
  id: string;
  risk: RiskLevel;
  attachmentNames: string[];
  message: Record<Language, string>;
  actions: Record<Language, string[]>;
  disclaimer: Record<Language, string>;
  privacy: Record<Language, string>;
};
