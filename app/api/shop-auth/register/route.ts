import {
  assertSameOrigin,
  createSessionCookie,
  registerShopUser,
  ShopAuthError,
} from "../../../backend/shop-auth/auth.service";

/** Creates one salted account record and signs the new user in immediately. */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const payload = (await request.json()) as {
      username?: string;
      password?: string;
    };
    const session = await registerShopUser(
      String(payload.username ?? ""),
      String(payload.password ?? ""),
    );

    return Response.json(
      { user: { username: session.user.username } },
      {
        status: 201,
        headers: {
          "set-cookie": createSessionCookie(
            session.token,
            session.expiresAt,
            request.url,
          ),
        },
      },
    );
  } catch (error) {
    const status = error instanceof ShopAuthError ? error.status : 503;
    const code =
      error instanceof ShopAuthError ? error.code : "auth_unavailable";
    return Response.json({ error: code }, { status });
  }
}
