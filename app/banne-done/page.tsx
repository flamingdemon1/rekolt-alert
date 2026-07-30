import type { Metadata } from "next";
import { getDistrictDataPage } from "../backend/pages/data.service";
import { DistrictDataPage } from "../components/pages/DistrictDataPage";

export const metadata: Metadata = { title: "Banne done" };

type DataPageProps = {
  searchParams: Promise<{ district?: string | string[] }>;
};

/** Resolves the selected map district before rendering its dedicated data view. */
export default async function DataPage({ searchParams }: DataPageProps) {
  const districtParameter = (await searchParams).district;
  const districtId = Array.isArray(districtParameter)
    ? districtParameter[0]
    : districtParameter;

  return <DistrictDataPage page={await getDistrictDataPage(districtId)} />;
}
