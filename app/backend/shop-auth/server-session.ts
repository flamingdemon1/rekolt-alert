import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  getShopUserFromToken,
  SHOP_SESSION_COOKIE,
} from "./auth.service";

/** Reads the HTTP-only cookie on the server; client code never handles it. */
export async function getCurrentShopUser() {
  const cookieStore = await cookies();
  return getShopUserFromToken(cookieStore.get(SHOP_SESSION_COOKIE)?.value);
}

export async function requireCurrentShopUser() {
  const user = await getCurrentShopUser();
  if (!user) {
    redirect("/magazin/login");
  }
  return user;
}
