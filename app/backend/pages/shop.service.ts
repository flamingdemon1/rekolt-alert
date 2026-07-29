import productDataset from "../../data/mauritius-agro-products.json";
import {
  shopKreolForms,
  shopKreolProductCopy,
  shopKreolSubcategories,
  shopKreolUnits,
} from "../../data/shop-kreol-translations";

type PurchaseOption = {
  form: string;
  priceMUR: number;
  unit: string;
  note: string;
};

type SeedProduct = {
  id: string;
  category: "Seeds & Plants";
  subcategory: string;
  english_name: string;
  kreol_name: string;
  purchase_options: {
    starting_from_scratch: PurchaseOption;
    direct_planting: PurchaseOption;
  };
};

type AgriculturalInput = {
  id: string;
  category: "Agro-Chemicals & Salts";
  subcategory: string;
  english_name: string;
  kreol_name: string;
  description: string;
  usage_purpose: string;
  priceMUR: number;
  unit: string;
};

type RawProduct = SeedProduct | AgriculturalInput;

export type ShopProductOption = {
  id: string;
  label: "start" | "direct" | "standard";
  form: string;
  formMfe: string;
  priceMUR: number;
  unit: string;
  unitMfe: string;
  note: string;
  noteMfe: string;
};

export type ShopProduct = {
  id: string;
  category: "plants" | "inputs";
  sourceCategory: string;
  subcategory: string;
  subcategoryMfe: string;
  englishName: string;
  kreolName: string;
  description: string;
  descriptionMfe: string;
  usagePurpose: string;
  usagePurposeMfe: string;
  image: string;
  options: ShopProductOption[];
  priceFrom: number;
};

export type ShopCatalogue = {
  products: ShopProduct[];
  productCount: number;
  plantCount: number;
  inputCount: number;
};

function imageForProduct(product: RawProduct): string {
  if (product.category === "Seeds & Plants") {
    if (product.subcategory === "Fruit") return "/shop/fruit-saplings.webp";
    if (product.subcategory === "Herb & Spice") {
      return "/shop/herb-seedlings.webp";
    }
    return "/shop/vegetable-seedlings.webp";
  }

  if (
    product.subcategory.includes("Bio-") ||
    product.english_name === "Neem Oil" ||
    product.english_name === "Seaweed Extract"
  ) {
    return "/shop/bio-crop-care.webp";
  }

  if (
    product.subcategory.includes("Soil Amendment") ||
    product.subcategory.includes("Grow Substrate")
  ) {
    return "/shop/soil-growing-media.webp";
  }

  if (
    product.subcategory.includes("Fertilizer") ||
    product.subcategory.includes("Nutrient")
  ) {
    return "/shop/fertilizer-nutrients.webp";
  }

  return "/shop/crop-protection.webp";
}

/** Normalizes both dataset record shapes into one catalogue contract. */
function normalizeProduct(product: RawProduct): ShopProduct {
  const kreolCopy = shopKreolProductCopy[product.id];
  const subcategoryMfe =
    shopKreolSubcategories[product.subcategory] ?? "Prodwi agrikol";

  if (product.category === "Seeds & Plants") {
    const options: ShopProductOption[] = [
      {
        id: "start",
        label: "start",
        ...product.purchase_options.starting_from_scratch,
        formMfe:
          shopKreolForms[product.purchase_options.starting_from_scratch.form] ??
          "Materyel pou koumanse",
        unitMfe:
          shopKreolUnits[product.purchase_options.starting_from_scratch.unit] ??
          "par inite",
        noteMfe: kreolCopy.description,
      },
      {
        id: "direct",
        label: "direct",
        ...product.purchase_options.direct_planting,
        formMfe:
          shopKreolForms[product.purchase_options.direct_planting.form] ??
          "Plant pare pou plante",
        unitMfe:
          shopKreolUnits[product.purchase_options.direct_planting.unit] ??
          "par inite",
        noteMfe: kreolCopy.purpose,
      },
    ];

    return {
      id: product.id,
      category: "plants",
      sourceCategory: product.category,
      subcategory: product.subcategory,
      subcategoryMfe,
      englishName: product.english_name,
      kreolName: product.kreol_name,
      description: options[0].note,
      descriptionMfe: kreolCopy.description,
      usagePurpose: options[1].note,
      usagePurposeMfe: kreolCopy.purpose,
      image: imageForProduct(product),
      options,
      priceFrom: Math.min(...options.map(({ priceMUR }) => priceMUR)),
    };
  }

  return {
    id: product.id,
    category: "inputs",
    sourceCategory: product.category,
    subcategory: product.subcategory,
    subcategoryMfe,
    englishName: product.english_name,
    kreolName: product.kreol_name,
    description: product.description,
    descriptionMfe: kreolCopy.description,
    usagePurpose: product.usage_purpose,
    usagePurposeMfe: kreolCopy.purpose,
    image: imageForProduct(product),
    options: [
      {
        id: "standard",
        label: "standard",
        form: product.subcategory,
        formMfe: subcategoryMfe,
        priceMUR: product.priceMUR,
        unit: product.unit,
        unitMfe: shopKreolUnits[product.unit] ?? "par inite",
        note: product.usage_purpose,
        noteMfe: kreolCopy.purpose,
      },
    ],
    priceFrom: product.priceMUR,
  };
}

/** Returns every item from the user-provided 46-product Mauritius dataset. */
export async function getShopCatalogue(): Promise<ShopCatalogue> {
  const products = (productDataset as RawProduct[]).map(normalizeProduct);

  return {
    products,
    productCount: products.length,
    plantCount: products.filter(({ category }) => category === "plants").length,
    inputCount: products.filter(({ category }) => category === "inputs").length,
  };
}
