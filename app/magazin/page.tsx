import type { Metadata } from "next";
import { getShopCatalogue } from "../backend/pages/shop.service";
import { requireCurrentShopUser } from "../backend/shop-auth/server-session";
import { ShopCataloguePage } from "../components/pages/ShopCataloguePage";

export const metadata: Metadata = { title: "Magazin" };
export const dynamic = "force-dynamic";

/** The catalogue stays server-protected and opens only after account login. */
export default async function ShopPage() {
  const user = await requireCurrentShopUser();
  const catalogue = await getShopCatalogue();

  return <ShopCataloguePage catalogue={catalogue} username={user.username} />;
}
