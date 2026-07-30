/**
 * Kreol Morisien catalogue copy for every product in the supplied dataset.
 * Keeping it separate makes the source dataset easy to compare and update.
 */
export const shopKreolProductCopy: Record<
  string,
  { description: string; purpose: string }
> = {
  CROP_001: {
    description: "Plant bann tuberkil direk dan bann siyon ki finn bien prepare.",
    purpose: "Tuberkil deza bourzonnen pou enn leve pli rapid.",
  },
  CROP_002: {
    description: "Fer semans zerm dan plato pandan trwa a kat semenn.",
    purpose: "Zenn plant pare pou transplante dan karo ouswa dan serre.",
  },
  CROP_003: {
    description: "Bizin enn pepinyer bien so pou gagn enn bon zerminasion.",
    purpose: "Rasin fini bien pran ek plant-la pare pou met dan karo.",
  },
  CROP_004: {
    description: "Sem dan plato avan transfer plant-la dan karo.",
    purpose: "Zenn plant ranforsi, pare pou enn bon devlopman dan zardin.",
  },
  CROP_005: {
    description: "Zerm anviron dis a katorz zour ek bizin enn saler regilie.",
    purpose: "Transplant direk dan karo ouswa dan enn gran po.",
  },
  CROP_006: {
    description: "Sem direk dan later parski kotomili pa kontan transplantasion.",
    purpose: "Enn po zerb pare pou lakwizinn ouswa pou plante deswit.",
  },
  CROP_007: {
    description: "Pous pli dousman ek kapav pran trwa a kat an avan donn fri.",
    purpose: "Plant grefe rezistan, kapav donn fri pli boner.",
  },
  CROP_008: {
    description: "Plant sorti depi semans; kalite fri kapav varye.",
    purpose: "Plant grefe pou gagn enn fri dou ek fidel ar so varyete.",
  },
  CROP_009: {
    description: "Tranp semans enn nwit avan plant dan later ouswa dan po.",
    purpose: "Zenn lian pare pou plante kot enn trey ouswa enn sipor.",
  },
  CROP_010: {
    description: "Anter lamwatie fri bourzonnen dan enn later ris ek imid.",
    purpose: "Rasin fini bien pran ek lian-la pare pou grimpe.",
  },
  CROP_011: {
    description: "Sem direk dan enn parter ki gagn boukou soley.",
    purpose: "Transplant dousman pou pa deranz so bann rasin.",
  },
  CROP_012: {
    description: "Plant de a trwa semans lor sak ti montikil dan later ris.",
    purpose: "Zenn lian pare pou plante avek ase lespas pou etale.",
  },
  CROP_013: {
    description: "Sem direk akote enn piket ouswa enn sipor an difil.",
    purpose: "Zenn plant pran vit lor enn file trey.",
  },
  CROP_014: {
    description: "Tranp semans avan plant li direk dan later.",
    purpose: "Zenn plant pare pou karo avek enn trey deza instale.",
  },
  CROP_015: {
    description: "Fane semans regilierman lor bann parter ki finn prepare.",
    purpose: "Plato zenn plant pou enn rekolt fey rapid dan detrwa semenn.",
  },
  CROP_016: {
    description: "Sem dan enn pepinyer bien fin ek eklersi tigit-tigit.",
    purpose: "Ti bilb pare pou plante fasilman ek gagn plis sikse.",
  },
  CROP_017: {
    description: "Separ bann lagous avan plant sakenn dan later.",
    purpose: "Lagous fini bourzonnen avek rasin ek enn bout ver.",
  },
  CROP_018: {
    description: "Kouronn ouswa ti repous pran dizwit a vennkat mwa pou donn fri.",
    purpose: "Repous for pran vit ek kapav donn fri dan douz a katorz mwa.",
  },
  CROP_019: {
    description: "Plant prop sorti laboratwar; li bizin swin dan pepinyer.",
    purpose: "Gran repous avek rasin, pare pou karo ek enn prodiksion pli rapid.",
  },
  CROP_020: {
    description: "Anter morso korm dan later ris ziska li avoy enn nouvo pous.",
    purpose: "Varyete konpak dan po, rezistan ar divan ek pare pou zardin.",
  },
  CROP_021: {
    description: "Gard rasin imid ek aroze li bien pandan bann premie zour.",
    purpose: "Rasin fini pran dan po ek plant-la kapav deza ena fler.",
  },
  CROP_022: {
    description: "Pie sorti depi semans pran plizir lane ek so gou kapav varye.",
    purpose: "Pie grefe donn fri pli boner ek gard kalite varyete-la.",
  },
  CROP_023: {
    description: "Zenn plant pous bien dousman ek pran boukou lane pou donn fri.",
    purpose: "Markot sorti lor enn bon pie ek kapav donn fri pli boner.",
  },
  CROP_024: {
    description: "Zenn pie sorti depi semans bizin pasians avan donn fri.",
    purpose: "Plant markote donn fri dou ek ranpli ar zi pli vit.",
  },
  CHEM_001: {
    description: "Angre an grenn bien ris an azot pou ranforsi devlopman bann fey.",
    purpose: "Ranplas azot pou gagn enn bon kresans ver.",
  },
  CHEM_002: {
    description: "Angre ekilibre avek bann eleman prinsipal pou prepar ek nouri later.",
    purpose: "Fertilite zeneral later ek devlopman plant.",
  },
  CHEM_003: {
    description: "Sours potasiom pou rasin, fler ek formasion bann fri.",
    purpose: "Amelior kalite, groser ek rezistans bann fri.",
  },
  CHEM_004: {
    description: "Disel solib pou ed evit pouritir anba tomat ek piman.",
    purpose: "Pou fertirigasion, idroponi ek enn bon striktir fri.",
  },
  CHEM_005: {
    description: "Koriz mank magneziom ki kapav fer bann fey vinn zonn.",
    purpose: "Sipleman magneziom ek souf pou plant.",
  },
  CHEM_006: {
    description: "Biopestisid organik ki repouse bann ti pes san tro deranz bon insekt.",
    purpose: "Kontrol ekolozik kont mous blan ek pis plant.",
  },
  CHEM_007: {
    description: "Fonzisid kontak protekter kont plizir maladi lor bann fey.",
    purpose: "Prevansion kont maladi sanpignon ek mildyou.",
  },
  CHEM_008: {
    description: "Insektisid ki azir vit kont seni, skarabe ek lezot insekt.",
    purpose: "Kontrol insekt ki manz ouswa sis bann plant.",
  },
  CHEM_009: {
    description: "Insektisid sible bien efikas kont seni ek bann ver fore.",
    purpose: "Kontrol seni ek ver ki atak fri.",
  },
  CHEM_010: {
    description: "Bakterisid ek fonzisid kontak pou tomat, pomdeter ek agrim.",
    purpose: "Kont tach bakteri, fletrisman ek mildyou.",
  },
  CHEM_011: {
    description: "Erbisid sistemik ki pa selektif pou netway enn terin net.",
    purpose: "Elimin move lerb avan plantasion.",
  },
  CHEM_012: {
    description: "Biostimilan pou ranforsi rasin, zenn plant ek rezistans ar lasesres.",
    purpose: "Stimile plant ek diminie stres.",
  },
  CHEM_013: {
    description: "Sipor san later pou kiltir dan bann serre idroponik.",
    purpose: "Kiltir legim avek metod idroponik.",
  },
  CHEM_014: {
    description: "Insektisid piretroid ki met bann pes karo anba kontrol rapidman.",
    purpose: "Kontrol mous, papion lannwit ek seni.",
  },
  CHEM_015: {
    description: "Sipleman eleman tras pou fey, pou evit dekolorasion ek mank nitrisyon.",
    purpose: "Koriz mank bann mikronitriman.",
  },
  CHEM_016: {
    description: "Angre azot ek souf ki azir vit, sirtou lor later alkalin.",
    purpose: "Rann later pli asid ek stimil kresans ver.",
  },
  CHEM_017: {
    description: "Angre fosfor bien konsantre pou devlop enn sistem rasin solid.",
    purpose: "Ranforsi rasin pandan plantasion.",
  },
  CHEM_018: {
    description: "Akarisid ek insektisid sistemik kont miner fey ek ti akarien.",
    purpose: "Kontrol akarien ek miner fey.",
  },
  CHEM_019: {
    description: "Insektisid sistemik ki sibl bann insekt ki sis lasav plant.",
    purpose: "Kontrol pis plant, mous blan ek trips.",
  },
  CHEM_020: {
    description: "Insektisid larz spekt ki azir vit par kontak.",
    purpose: "Met seni ek bann pes difisil anba kontrol.",
  },
  CHEM_021: {
    description: "Biofonzisid itil ki protez rasin kont pouritir ek sanpignon later.",
    purpose: "Proteksion biolozik rasin ek later.",
  },
  CHEM_022: {
    description: "Amelyoran natirel pou diminie lasidite later ek ed absorsion nitrisyon.",
    purpose: "Ekilibre nivo pH ek amelior kondisyon later.",
  },
};

export const shopKreolSubcategories: Record<string, string> = {
  Vegetable: "Legim",
  "Herb & Spice": "Zerb ek zepis",
  Fruit: "Fri",
  "Fertilizer / Inorganic Salt": "Angre / disel mineral",
  "Fertilizer / Compound": "Angre konpoze",
  "Bio-Pesticide / Organic": "Biopestisid / organik",
  Fungicide: "Fonzisid",
  Insecticide: "Insektisid",
  "Fungicide / Bactericide": "Fonzisid / bakterisid",
  "Herbicide / Weedicide": "Erbisid",
  "Nutrient Supplement": "Sipleman nitritif",
  "Grow Substrate / Supplement": "Sipor kiltir / sipleman",
  "Insecticide / Acaricide": "Insektisid / akarisid",
  "Bio-Fungicide": "Biofonzisid",
  "Soil Amendment": "Amelyoran later",
};

export const shopKreolForms: Record<string, string> = {
  "Seed Potatoes (Tubers)": "Tuberkil semans pomdeter",
  "Pre-sprouted Seed Tubers": "Tuberkil semans deza bourzonnen",
  "Seed Packet": "Pake semans",
  "Plug Seedling (Alvéole)": "Zenn plant dan alveol",
  "Potted Young Plant": "Zenn plant dan po",
  "Bulk Seeds": "Semans an kantite",
  "Potted Multi-Sprout Cluster": "Plizir ti pous dan po",
  "Seedling Rootstock": "Zenn plant pou port-gref",
  "Grafted Potted Sapling": "Zenn pie grefe dan po",
  "Germinated Seedling": "Zenn plant fini zerme",
  "Grafted Fruit Sapling": "Zenn pie fri grefe",
  "Vining Seedling Plug": "Zenn plant lian dan alveol",
  "Sprouting Whole Fruit": "Fri antie pe bourzonnen",
  "Rooted Sprouted Plant": "Plant bourzonnen avek rasin",
  "Young Vine Seedling": "Zenn plant lian",
  "Plug Seedling": "Zenn plant dan alveol",
  "Tray of Seedlings (Barquette)": "Plato zenn plant",
  "Onion Sets / Seedlings (Onyon Ti-Brin)": "Ti bilb ek zenn plant onyon",
  "Garlic Seed Bulbs": "Bilb lay pou semans",
  "Pre-sprouted Cloves": "Lagous lay deza bourzonnen",
  "Crown / Small Offset": "Kouronn ouswa ti repous",
  "Mature Sucker Plant": "Repous matir",
  "Tissue Culture Micro-plant": "Ti plant kiltir tisi",
  "Rooted Rhizome Sucker": "Repous rizom avek rasin",
  "Small Corm Planting Piece": "Ti morso korm pou plante",
  "Potted Vigorous Plant": "Plant for dan po",
  "Bare-root Runner": "Repous avek rasin ni",
  "Potted Rooted Runner": "Repous avek rasin dan po",
  "Seedling Tree (Manguier Sauvage)": "Zenn pie sorti depi semans",
  "Grafted Variety Tree (Maison Rouge / Grafted)": "Pie varyete grefe",
  "Seedling Plant": "Zenn plant",
  "Air-Layered Tree (Marcotte)": "Pie markote",
  "Seed-grown Sapling": "Zenn pie sorti depi semans",
  "Marcotted / Air-Layered Plant": "Plant markote",
};

export const shopKreolUnits: Record<string, string> = {
  "1kg bag": "sak 1 kg",
  "1kg bag (chitted)": "sak 1 kg, fini bourzonnen",
  "5g packet (~1,000 seeds)": "pake 5 g, anviron 1 000 semans",
  "per seedling plant": "par zenn plant",
  "5g packet": "pake 5 g",
  "per potted plant": "par plant dan po",
  "50g seed pack": "pake semans 50 g",
  "per small pot": "par ti po",
  "per young un-grafted plant": "par zenn plant pa grefe",
  "per grafted plant": "par plant grefe",
  "per small plant": "par ti plant",
  "10g seed pack": "pake semans 10 g",
  "per sprouted fruit": "par fri bourzonnen",
  "per established potted vine": "par lian bien pran dan po",
  "20g seed pack": "pake semans 20 g",
  "25g seed pack": "pake semans 25 g",
  "tray of 20 mini-plugs": "plato 20 ti plant",
  "bundle of 100 sets": "pake 100 ti bilb",
  "250g seed bulbs": "250 g bilb semans",
  "250g sprouted pack": "pake bourzonnen 250 g",
  "per raw crown/slip": "par kouronn ouswa repous",
  "per robust sucker plant": "par repous for",
  "per small lab-grown plant": "par ti plant laboratwar",
  "per field sucker plant": "par repous pare pou karo",
  "per un-sprouted corm": "par korm pa ankor bourzonnen",
  "per bare-root runner": "par repous avek rasin ni",
  "per seed-grown sapling": "par zenn pie sorti depi semans",
  "per young seedling": "par zenn plant",
  "per marcotting plant": "par plant markote",
  "per young sapling": "par zenn pie",
  "per established plant": "par plant bien pran",
  kg: "kg",
  "500ml bottle": "boutey 500 ml",
  "500g pack": "pake 500 g",
  "250ml bottle": "boutey 250 ml",
  "100ml bottle": "boutey 100 ml",
  "1L bottle": "boutey 1 L",
  slab: "enn blok",
  "250g pack": "pake 250 g",
  "25kg bag": "sak 25 kg",
};
