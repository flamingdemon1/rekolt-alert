import { districtRisks } from "../../data/site-content";
import type { DistrictRisk, Language, RiskLevel } from "../../types";

type LocalisedText = Record<Language, string>;

export type DistrictIssue = {
  id: string;
  severity: RiskLevel;
  category: LocalisedText;
  title: LocalisedText;
  detail: LocalisedText;
  action: LocalisedText;
};

export type DistrictDataLabels = {
  back: string;
  eyebrow: string;
  overview: string;
  currentRisk: string;
  primarySignal: string;
  monitoredSignals: string;
  issuesTitle: string;
  issuesIntro: string;
  recommendedAction: string;
  demoNotice: string;
};

export type DistrictDataPage = {
  activePath: "/banne-done";
  district: DistrictRisk;
  issues: DistrictIssue[];
  labels: Record<Language, DistrictDataLabels>;
};

type DistrictIssueProfile = {
  primaryDetail: LocalisedText;
  secondaryTitle: LocalisedText;
  secondaryDetail: LocalisedText;
};

/**
 * These demo profiles are deliberately separate from the UI. A future database
 * or agricultural-alert API can replace this object without changing the page.
 */
const issueProfiles: Record<string, DistrictIssueProfile> = {
  "black-river": {
    primaryDetail: {
      mfe: "Limidite kapav fer enn kous blan ouswa gri aparet lor fey.",
      en: "Humidity can encourage a white or grey coating to appear on leaves.",
    },
    secondaryTitle: {
      mfe: "Tach lor fey tomat",
      en: "Tomato leaf spotting",
    },
    secondaryDetail: {
      mfe: "Get bann ti tach maron lor fey ki pli pre ar later.",
      en: "Watch for small brown marks on leaves closest to the soil.",
    },
  },
  flacq: {
    primaryDetail: {
      mfe: "Get bann ti pwin zonn ek enn latwal fin anba fey tomat.",
      en: "Look for fine yellow dots and light webbing under tomato leaves.",
    },
    secondaryTitle: {
      mfe: "Piron lor piman",
      en: "Aphids on chilli",
    },
    secondaryDetail: {
      mfe: "Bann nouvo fey ki pe ploye kapav montre enn koloni piron.",
      en: "Curling new growth can indicate an aphid colony.",
    },
  },
  "grand-port": {
    primaryDetail: {
      mfe: "Tach fonse avek enn bor zonn kapav propaze apre lapli.",
      en: "Dark marks with yellow edges can spread after rainfall.",
    },
    secondaryTitle: {
      mfe: "Mous fri dan verze",
      en: "Fruit-fly activity",
    },
    secondaryDetail: {
      mfe: "Verifie fri ki ena ti pike ouswa ki pe vinn mou tro vit.",
      en: "Check fruit for puncture marks or unusually fast softening.",
    },
  },
  moka: {
    primaryDetail: {
      mfe: "Pena okenn signal sever; kontign fer observasion regilier.",
      en: "No severe signal is active; continue routine observation.",
    },
    secondaryTitle: {
      mfe: "Kontrol limidite later",
      en: "Soil-moisture check",
    },
    secondaryDetail: {
      mfe: "Evit les delo reste otour rasinn apre bann gro arozaz.",
      en: "Avoid leaving water around roots after heavy irrigation.",
    },
  },
  pamplemousses: {
    primaryDetail: {
      mfe: "Get trou iregilie ek ti exkrema lor nouvo fey may.",
      en: "Look for irregular holes and frass on young maize leaves.",
    },
    secondaryTitle: {
      mfe: "Piron lor bred",
      en: "Aphids on leafy greens",
    },
    secondaryDetail: {
      mfe: "Get anba fey pou bann ti group insek ek bann fey ki pe ploye.",
      en: "Inspect leaf undersides for clustered insects and curling.",
    },
  },
  "plaines-wilhems": {
    primaryDetail: {
      mfe: "Pena okenn signal sever; tan fre demann enn swivi regilier.",
      en: "No severe signal is active; cooler conditions still need routine checks.",
    },
    secondaryTitle: {
      mfe: "Vey mildi",
      en: "Mildew watch",
    },
    secondaryDetail: {
      mfe: "Get bann plak pal lor fey apre plizier zour limid.",
      en: "Look for pale patches after several humid days.",
    },
  },
  "port-louis": {
    primaryDetail: {
      mfe: "Piron kapav rasanble lor nouvo pous ek rann fey kolan.",
      en: "Aphids may cluster on new growth and leave foliage sticky.",
    },
    secondaryTitle: {
      mfe: "Stres lasaler",
      en: "Heat stress",
    },
    secondaryDetail: {
      mfe: "Bann fey ki pe tonbe dan tanto kapav indik mank delo.",
      en: "Leaves that remain wilted late in the day can indicate water stress.",
    },
  },
  "riviere-du-rempart": {
    primaryDetail: {
      mfe: "Get bann nouvo fey piman ki ploye ek bann ti insek anba.",
      en: "Check curled chilli growth for small insects underneath.",
    },
    secondaryTitle: {
      mfe: "Vey pizon lor tomat",
      en: "Mite watch on tomato",
    },
    secondaryDetail: {
      mfe: "Bann ti pwin pal lor fey kapav enn premie signal.",
      en: "Fine pale stippling on leaves can be an early sign.",
    },
  },
  savanne: {
    primaryDetail: {
      mfe: "Pena okenn signal sever; kontign get bann karo apre divan.",
      en: "No severe signal is active; keep checking fields after strong wind.",
    },
    secondaryTitle: {
      mfe: "Domaz divan",
      en: "Wind damage",
    },
    secondaryDetail: {
      mfe: "Verifie bann tiz kase ek plant ki finn panche apre rafal.",
      en: "Inspect broken stems and leaning plants after gusts.",
    },
  },
};

const labels: Record<Language, DistrictDataLabels> = {
  mfe: {
    back: "Retour lor kart",
    eyebrow: "Done par distrik",
    overview: "Rezime distrik",
    currentRisk: "Risk aktiel",
    primarySignal: "Signal prinsipal",
    monitoredSignals: "signal pe swiv",
    issuesTitle: "Problem ek signal pou swiv",
    issuesIntro:
      "Get sak signal, so nivo risk ek aksion pratik ki kapav fer lor terin.",
    recommendedAction: "Aksion rekomande",
    demoNotice:
      "Sa bann signal-la se done demonstrasion; verifie avek enn profesionnnel agrikol.",
  },
  en: {
    back: "Back to the map",
    eyebrow: "District data",
    overview: "District overview",
    currentRisk: "Current risk",
    primarySignal: "Primary signal",
    monitoredSignals: "Signals monitored",
    issuesTitle: "Issues and signals to watch",
    issuesIntro:
      "Review each signal, its risk level and a practical field action.",
    recommendedAction: "Recommended action",
    demoNotice:
      "These are demonstration signals; verify them with an agricultural professional.",
  },
};

function actionForRisk(risk: RiskLevel): LocalisedText {
  if (risk === "high") {
    return {
      mfe: "Izol plant afekte, pran foto ek rod konsey agrikol san tarde.",
      en: "Isolate affected plants, take clear photos and seek agricultural advice promptly.",
    };
  }

  if (risk === "moderate") {
    return {
      mfe: "Mark zonn-la ek re-get anba fey dan prosin 24 a 48 er.",
      en: "Mark the area and inspect leaf undersides again within 24 to 48 hours.",
    };
  }

  return {
    mfe: "Kontign enn observasion regilier ek gard enn not lor sanzman.",
    en: "Continue routine observation and keep a note of any changes.",
  };
}

/** Builds a compact, ordered issue list for the requested district. */
function buildIssues(district: DistrictRisk): DistrictIssue[] {
  const profile = issueProfiles[district.id] ?? issueProfiles.pamplemousses;
  const secondaryRisk: RiskLevel =
    district.risk === "high" ? "moderate" : "low";

  return [
    {
      id: `${district.id}-primary`,
      severity: district.risk,
      category: { mfe: "Lasante plant", en: "Plant health" },
      title: { mfe: district.issueMfe, en: district.issueEn },
      detail: profile.primaryDetail,
      action: actionForRisk(district.risk),
    },
    {
      id: `${district.id}-secondary`,
      severity: secondaryRisk,
      category: { mfe: "Vey lor karo", en: "Field watch" },
      title: profile.secondaryTitle,
      detail: profile.secondaryDetail,
      action: actionForRisk(secondaryRisk),
    },
    {
      id: `${district.id}-conditions`,
      severity: district.risk === "low" ? "low" : "moderate",
      category: { mfe: "Kondision later", en: "Field conditions" },
      title: { mfe: "Drenaz ek limidite", en: "Drainage and moisture" },
      detail: {
        mfe: "Get si delo pe reste otour rasinn ek si fey reste mouye tro lontan.",
        en: "Check whether water is pooling around roots or leaves remain wet too long.",
      },
      action: {
        mfe: "Gard drenaz lib ek adapte arozaz dapre kondisyon later.",
        en: "Keep drainage clear and adjust irrigation to the soil condition.",
      },
    },
  ];
}

/** Supplies one district-focused response to the Data route. */
export async function getDistrictDataPage(
  requestedDistrict?: string,
): Promise<DistrictDataPage> {
  const district =
    districtRisks.find(({ id }) => id === requestedDistrict) ??
    districtRisks.find(({ id }) => id === "pamplemousses") ??
    districtRisks[0];

  return {
    activePath: "/banne-done",
    district,
    issues: buildIssues(district),
    labels,
  };
}
