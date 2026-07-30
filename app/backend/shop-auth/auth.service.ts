import {
  deleteShopSession,
  findUserBySessionHash,
  findUserByUsername,
  insertShopSession,
  insertShopUser,
  type ShopSessionUser,
} from "./auth.repository";
import {
  createSessionToken,
  hashPassword,
  hashSessionToken,
  passwordPolicy,
  verifyPassword,
} from "./password.service";

export const SHOP_SESSION_COOKIE = "rekolt_shop_session";
const SESSION_SECONDS = 60 * 60 * 24 * 7;
const USERNAME_PATTERN = /^[A-Za-z0-9._-]{3,30}$/;

export class ShopAuthError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
  ) {
    super(code);
  }
}

type AuthenticatedSession = {
  user: ShopSessionUser;
  token: string;
  expiresAt: number;
};

function validateCredentials(usernameInput: string, password: string) {
  const username = usernameInput.trim();
  if (!USERNAME_PATTERN.test(username)) {
    throw new ShopAuthError("invalid_username", 400);
  }
  if (
    password.length < passwordPolicy.minimumLength ||
    password.length > passwordPolicy.maximumLength
  ) {
    throw new ShopAuthError("invalid_password", 400);
  }

  return { username, usernameNormalized: username.toLocaleLowerCase("en") };
}

async function issueSession(
  user: ShopSessionUser,
): Promise<AuthenticatedSession> {
  const token = createSessionToken();
  const tokenHash = await hashSessionToken(token);
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_SECONDS;

  await insertShopSession(tokenHash, user.id, expiresAt);
  return { user: { ...user, expiresAt }, token, expiresAt };
}

/** Registers a new shop account without ever persisting the plain password. */
export async function registerShopUser(
  usernameInput: string,
  password: string,
): Promise<AuthenticatedSession> {
  const { username, usernameNormalized } = validateCredentials(
    usernameInput,
    password,
  );
  if (await findUserByUsername(usernameNormalized)) {
    throw new ShopAuthError("username_taken", 409);
  }

  const passwordRecord = await hashPassword(password);
  const userId = crypto.randomUUID();

  try {
    await insertShopUser({
      id: userId,
      username,
      usernameNormalized,
      passwordHash: passwordRecord.hash,
      passwordSalt: passwordRecord.salt,
      passwordIterations: passwordRecord.iterations,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("UNIQUE") || message.includes("unique")) {
      throw new ShopAuthError("username_taken", 409);
    }
    throw error;
  }

  return issueSession({ id: userId, username, expiresAt: 0 });
}

/** Verifies the salted PBKDF2 record and returns one new opaque session. */
export async function loginShopUser(
  usernameInput: string,
  password: string,
): Promise<AuthenticatedSession> {
  const username = usernameInput.trim();
  if (
    !USERNAME_PATTERN.test(username) ||
    password.length < 1 ||
    password.length > passwordPolicy.maximumLength
  ) {
    throw new ShopAuthError("invalid_credentials", 401);
  }
  const user = await findUserByUsername(username.toLocaleLowerCase("en"));

  if (
    !user ||
    !(await verifyPassword(password, {
      hash: user.passwordHash,
      salt: user.passwordSalt,
      iterations: user.passwordIterations,
    }))
  ) {
    throw new ShopAuthError("invalid_credentials", 401);
  }

  return issueSession({ id: user.id, username: user.username, expiresAt: 0 });
}

export async function getShopUserFromToken(
  token?: string,
): Promise<ShopSessionUser | null> {
  if (!token) return null;
  return findUserBySessionHash(await hashSessionToken(token));
}

export async function logoutShopUser(token?: string): Promise<void> {
  if (!token) return;
  await deleteShopSession(await hashSessionToken(token));
}

export function readShopSessionCookie(
  cookieHeader: string | null,
): string | undefined {
  if (!cookieHeader) return undefined;

  for (const cookie of cookieHeader.split(";")) {
    const [name, ...parts] = cookie.trim().split("=");
    if (name === SHOP_SESSION_COOKIE) {
      return decodeURIComponent(parts.join("="));
    }
  }

  return undefined;
}

export function createSessionCookie(
  token: string,
  expiresAt: number,
  requestUrl: string,
): string {
  const secure = new URL(requestUrl).protocol === "https:" ? "; Secure" : "";
  return `${SHOP_SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_SECONDS}; Expires=${new Date(
    expiresAt * 1000,
  ).toUTCString()}${secure}`;
}

export function clearSessionCookie(requestUrl: string): string {
  const secure = new URL(requestUrl).protocol === "https:" ? "; Secure" : "";
  return `${SHOP_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${secure}`;
}

/** Rejects cross-origin browser writes while still accepting non-browser tests. */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    throw new ShopAuthError("invalid_origin", 403);
  }
}
