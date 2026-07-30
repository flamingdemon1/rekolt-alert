import {
  assertSameOrigin,
  clearSessionCookie,
  logoutShopUser,
  readShopSessionCookie,
  ShopAuthError,
} from "../../../backend/shop-auth/auth.service";

/** Invalidates the server-side session before clearing the browser cookie. */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await logoutShopUser(
      readShopSessionCookie(request.headers.get("cookie")),
    );

    return Response.json(
      { ok: true },
      { headers: { "set-cookie": clearSessionCookie(request.url) } },
    );
  } catch (error) {
    const status = error instanceof ShopAuthError ? error.status : 503;
    const code =
      error instanceof ShopAuthError ? error.code : "auth_unavailable";
    return Response.json({ error: code }, { status });
  }
}
