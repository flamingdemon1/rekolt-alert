import type { RiskLevel } from "../../types";
import type { PlantChatInput, PlantChatReply } from "./plant-chat.types";

const MAX_ATTACHMENTS = 3;
const MAX_ATTACHMENT_SIZE = 500 * 1024;
const MAX_TOTAL_SIZE = 1200 * 1024;
const SUPPORTED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
]);

type GuidanceRule = {
  terms: string[];
  risk: RiskLevel;
  messageMfe: string;
  messageEn: string;
  actionsMfe: string[];
  actionsEn: string[];
};

const guidanceRules: GuidanceRule[] = [
  {
    terms: ["tach", "spot", "brown mark", "black mark", "lesion"],
    risk: "moderate",
    messageMfe:
      "Bann tach lor fey kapav sorti depi enn problem fongis, bakterien ouswa stres lor plant.",
    messageEn:
      "Leaf spots can be linked to fungal, bacterial or environmental stress.",
    actionsMfe: [
      "Separ plant ki afekte si li posib.",
      "Evit mouy fey kan pe aroze.",
      "Get si bann tach pe propaze lor nouvo fey.",
    ],
    actionsEn: [
      "Separate affected plants where possible.",
      "Avoid wetting the leaves while watering.",
      "Check whether the spots are spreading to new leaves.",
    ],
  },
  {
    terms: ["zonn", "yellow", "pale leaf", "chlorosis"],
    risk: "moderate",
    messageMfe:
      "Fey zonn kapav indike stres delo, problem rasinn ouswa enn mank nutriman.",
    messageEn:
      "Yellow leaves can indicate water stress, root trouble or a nutrient imbalance.",
    actionsMfe: [
      "Verifie si later tro sek ouswa tro mouye.",
      "Konpar bann vie fey ar bann nouvo.",
      "Fer enn test later avan azout fertilizan.",
    ],
    actionsEn: [
      "Check whether the soil is too dry or too wet.",
      "Compare older leaves with newer growth.",
      "Test the soil before adding fertiliser.",
    ],
  },
  {
    terms: ["trou", "hole", "mange", "chewed", "caterpillar", "chenille"],
    risk: "high",
    messageMfe:
      "Bann trou ouswa bor fey ki finn manze souvan indike enn atak insekt.",
    messageEn:
      "Holes or chewed leaf edges commonly point to a leaf-feeding pest.",
    actionsMfe: [
      "Get anba fey boner gramatin.",
      "Pran enn foto pros ar insekt ouswa dizef.",
      "Pa servi pestisid avan konfirm lespes-la.",
    ],
    actionsEn: [
      "Inspect leaf undersides early in the morning.",
      "Take a close photo of any pest or eggs.",
      "Do not use pesticide before confirming the species.",
    ],
  },
  {
    terms: ["lapousier blan", "white powder", "powdery", "mildi"],
    risk: "high",
    messageMfe:
      "Enn depo blan lor fey kapav aligne ar mildi poud, sirtou kan ler pa sirkile bien.",
    messageEn:
      "A white coating may align with powdery mildew, especially where airflow is poor.",
    actionsMfe: [
      "Amelior lespas ek sirkilasion ler ant plant.",
      "Pa konpost fey ki bien afekte.",
      "Konfirm tretman adapte ar enn konseye agrikol.",
    ],
    actionsEn: [
      "Improve spacing and airflow between plants.",
      "Do not compost heavily affected leaves.",
      "Confirm the right treatment with an agricultural adviser.",
    ],
  },
  {
    terms: ["fletri", "wilt", "droop", "tonbe"],
    risk: "moderate",
    messageMfe:
      "Fletrisman kapav vinn depi stres delo, salinite, domaz rasinn ouswa maladi.",
    messageEn:
      "Wilting can result from water stress, salinity, root damage or disease.",
    actionsMfe: [
      "Touche later avan aroze ankor.",
      "Get si ena pouritir ouswa domaz kot rasinn.",
      "Swiv plant-la pandan prosenn 24 erdtan.",
    ],
    actionsEn: [
      "Check the soil before watering again.",
      "Look for root damage or rot.",
      "Monitor the plant over the next 24 hours.",
    ],
  },
  {
    terms: ["insekt", "insect", "aphid", "mite", "puceron", "fly"],
    risk: "high",
    messageMfe:
      "Bizin idantifie insekt-la avan swazir enn tretman, parski pa tou insekt ki danzere.",
    messageEn:
      "The insect should be identified before treatment because not every insect is harmful.",
    actionsMfe: [
      "Pran enn foto bien pros ar insekt-la.",
      "Get lezot plant dan mem ranze.",
      "Gard enn echantiyon si ou bizin montre enn profesionnnel.",
    ],
    actionsEn: [
      "Take a clear close-up of the insect.",
      "Inspect nearby plants in the same row.",
      "Keep a sample if you need a professional identification.",
    ],
  },
];

export class PlantChatError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

/** Validates chat input without persisting the submitted prompt or files. */
function validateInput(input: PlantChatInput) {
  if (!input.prompt.trim() && !input.attachments.length) {
    throw new PlantChatError("Write a question or attach a plant photo.");
  }
  if (input.prompt.length > 2000) {
    throw new PlantChatError("Keep the message below 2,000 characters.");
  }
  if (input.attachments.length > MAX_ATTACHMENTS) {
    throw new PlantChatError("Attach no more than three images.");
  }

  const totalSize = input.attachments.reduce((sum, file) => sum + file.size, 0);
  if (totalSize > MAX_TOTAL_SIZE) {
    throw new PlantChatError("The processed attachments are too large.", 413);
  }

  input.attachments.forEach((file) => {
    if (!SUPPORTED_TYPES.has(file.type)) {
      throw new PlantChatError("Attach JPEG, PNG, WebP or HEIC images only.");
    }
    if (file.size > MAX_ATTACHMENT_SIZE) {
      throw new PlantChatError(
        "Each processed attachment must be 500 KB or smaller.",
        413,
      );
    }
  });
}

/** Chooses the closest field-guidance rule from the grower's own description. */
function matchGuidance(prompt: string) {
  const normalisedPrompt = prompt.toLocaleLowerCase();
  return guidanceRules.find((rule) =>
    rule.terms.some((term) => normalisedPrompt.includes(term)),
  );
}

/**
 * Produces a conversational preliminary reply. Photos are accepted as context
 * for the report, but the service never claims a laboratory or vision result.
 */
export async function answerPlantQuestion(
  input: PlantChatInput,
): Promise<PlantChatReply> {
  validateInput(input);

  const matchedRule = matchGuidance(input.prompt);
  const hasAttachments = input.attachments.length > 0;
  const fallbackMessageMfe = hasAttachments
    ? "Mo finn resevwar ou foto. Azout kouler, form ek plas kot problem-la ete pou gagn enn direksion pli presi."
    : "Donn mwa nom plant-la, parti ki afekte, kouler ek depi kan problem-la finn koumanse.";
  const fallbackMessageEn = hasAttachments
    ? "I received your photo. Add the colour, shape and affected area for more precise guidance."
    : "Tell me the crop, affected part, colour and when the problem started.";

  return {
    id: crypto.randomUUID(),
    risk: matchedRule?.risk ?? "low",
    attachmentNames: input.attachments.map((file) => file.name),
    message: {
      mfe: matchedRule?.messageMfe ?? fallbackMessageMfe,
      en: matchedRule?.messageEn ?? fallbackMessageEn,
    },
    actions: {
      mfe: matchedRule?.actionsMfe ?? [
        "Pran enn foto dan lalimier natirel.",
        "Get lao ek anba fey-la.",
        "Dir mwa si lezot plant ena mem sign.",
      ],
      en: matchedRule?.actionsEn ?? [
        "Take a photo in natural light.",
        "Inspect both sides of the leaf.",
        "Tell me whether nearby plants show the same signs.",
      ],
    },
    disclaimer: {
      mfe: "Dokter Plant donn enn premie gid; li pa ranplas enn diagnostic profesionnnel.",
      en: "Dokter Plant provides preliminary guidance, not a professional diagnosis.",
    },
    privacy: {
      mfe: "Bann fisie finn servi zis pou sa repons-la ek pa finn anrezistre dan enn bazdone.",
      en: "Files were processed only for this response and were not stored in a database.",
    },
  };
}
