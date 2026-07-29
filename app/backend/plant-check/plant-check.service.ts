import type {
  PlantCheckInput,
  PlantCheckResult,
  PlantSymptom,
} from "./plant-check.types";

// The browser reduces large photos before upload to keep field submissions fast.
const MAX_IMAGE_SIZE = 900 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
]);

type ScreeningRule = {
  findingMfe: string;
  findingEn: string;
  risk: PlantCheckResult["risk"];
  actionsMfe: string[];
  actionsEn: string[];
};

const rules: Record<PlantSymptom, ScreeningRule> = {
  spots: {
    findingMfe: "Bann tach kapav aligne ar enn problem fongis ouswa bakterien.",
    findingEn: "The reported spots may align with a fungal or bacterial issue.",
    risk: "moderate",
    actionsMfe: [
      "Separ plant ki afekte si li posib.",
      "Evit mouy fey kan pe aroze.",
      "Fer verifie enn echantiyon par enn konseye agrikol.",
    ],
    actionsEn: [
      "Separate the affected plant when possible.",
      "Avoid wetting leaves while watering.",
      "Have a sample checked by an agricultural adviser.",
    ],
  },
  yellowing: {
    findingMfe: "Zonisman kapav sorti depi delo, rasinn ouswa mank nutriman.",
    findingEn: "Yellowing can be linked to water, root or nutrient stress.",
    risk: "moderate",
    actionsMfe: [
      "Get si later tro sek ouswa tro mouye.",
      "Konpar bann vie fey ek bann nouvo fey.",
      "Fer enn test later avan azout plis fertilizan.",
    ],
    actionsEn: [
      "Check whether the soil is too dry or too wet.",
      "Compare older leaves with newer leaves.",
      "Test the soil before adding more fertiliser.",
    ],
  },
  holes: {
    findingMfe: "Bann trou indike souvan enn atak insekt ki manz fey.",
    findingEn: "Holes commonly indicate a leaf-chewing pest.",
    risk: "high",
    actionsMfe: [
      "Get anba fey boner gramatin.",
      "Retir bann insekt vizib san propaz zot.",
      "Kontakte servis agrikol si domaz pe ogmante vit.",
    ],
    actionsEn: [
      "Inspect leaf undersides early in the morning.",
      "Remove visible pests without spreading them.",
      "Contact an agricultural service if damage increases quickly.",
    ],
  },
  powder: {
    findingMfe: "Lapousier blan kapav aligne ar mildi poud.",
    findingEn: "White powder may align with powdery mildew.",
    risk: "high",
    actionsMfe: [
      "Amelior sirkilasion ler ant plant.",
      "Pa konpost fey ki bien afekte.",
      "Konfirm tretman adapte ar enn profesionnnel.",
    ],
    actionsEn: [
      "Improve airflow between plants.",
      "Do not compost heavily affected leaves.",
      "Confirm suitable treatment with a professional.",
    ],
  },
  wilting: {
    findingMfe: "Fletrisman kapav vinn depi stres delo, rasinn ouswa maladi.",
    findingEn: "Wilting can come from water, root or disease stress.",
    risk: "moderate",
    actionsMfe: [
      "Verifie limidite later avan aroze.",
      "Get si ena domaz ouswa pouritir kot rasinn.",
      "Swiv plant-la pandan prosenn 24 erdtan.",
    ],
    actionsEn: [
      "Check soil moisture before watering.",
      "Look for root damage or rot.",
      "Monitor the plant over the next 24 hours.",
    ],
  },
  insects: {
    findingMfe: "Prezans insekt bizin idantifie avan swazir enn tretman.",
    findingEn: "Visible insects should be identified before choosing treatment.",
    risk: "high",
    actionsMfe: [
      "Pran enn foto pros ar insekt-la.",
      "Get lezot plant dan mem ranze.",
      "Pa servi pestisid san konfirm lespes ek doz.",
    ],
    actionsEn: [
      "Take a close photo of the insect.",
      "Inspect other plants in the same row.",
      "Do not use pesticide before confirming species and dose.",
    ],
  },
};

export class PlantCheckError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

/** Validates the uploaded report before applying the symptom screening rules. */
function validateInput(input: PlantCheckInput) {
  if (!input.crop.trim()) {
    throw new PlantCheckError("Please select a crop.");
  }
  if (!input.symptoms.length) {
    throw new PlantCheckError("Please select at least one visible symptom.");
  }
  if (!SUPPORTED_IMAGE_TYPES.has(input.image.type)) {
    throw new PlantCheckError("Upload a JPEG, PNG, WebP or HEIC image.");
  }
  if (input.image.size > MAX_IMAGE_SIZE) {
    throw new PlantCheckError("The processed image must be 900 KB or smaller.", 413);
  }
}

/**
 * Produces a preliminary screening from submitted symptoms. The image is
 * validated and attached to the report, but this does not pretend to be a
 * laboratory or computer-vision diagnosis.
 */
export async function screenPlant(
  input: PlantCheckInput,
): Promise<PlantCheckResult> {
  validateInput(input);

  const matchedRules = input.symptoms.map((symptom) => rules[symptom]);
  const primary =
    matchedRules.find((rule) => rule.risk === "high") ?? matchedRules[0];

  return {
    id: crypto.randomUUID(),
    crop: input.crop.trim(),
    risk: primary.risk,
    imageName: input.image.name,
    finding: {
      mfe: primary.findingMfe,
      en: primary.findingEn,
    },
    actions: {
      mfe: primary.actionsMfe,
      en: primary.actionsEn,
    },
    disclaimer: {
      mfe: "Sa se enn premie screening, pa enn diagnostic profesionnnel.",
      en: "This is a preliminary screening, not a professional diagnosis.",
    },
  };
}
