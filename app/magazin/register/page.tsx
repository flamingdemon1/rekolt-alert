import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentShopUser } from "../../backend/shop-auth/server-session";
import { ShopAuthPage } from "../../components/pages/ShopAuthPage";

export const metadata: Metadata = { title: "Kree kont Magazin" };
export const dynamic = "force-dynamic";

/** Registration is unnecessary when a valid shop session already exists. */
export default async function ShopRegisterPage() {
  if (await getCurrentShopUser()) {
    redirect("/magazin");
  }
  return <ShopAuthPage mode="register" />;
}
