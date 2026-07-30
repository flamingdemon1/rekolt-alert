import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentShopUser } from "../../backend/shop-auth/server-session";
import { ShopAuthPage } from "../../components/pages/ShopAuthPage";

export const metadata: Metadata = { title: "Konekte dan Magazin" };
export const dynamic = "force-dynamic";

/** Existing sessions bypass the login screen and return to the catalogue. */
export default async function ShopLoginPage() {
  if (await getCurrentShopUser()) {
    redirect("/magazin");
  }
  return <ShopAuthPage mode="login" />;
}
