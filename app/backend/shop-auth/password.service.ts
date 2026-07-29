const PASSWORD_HASH_ROUNDS = 210_000;
const SALT_BYTES = 16;
const DERIVED_KEY_BYTES = 32;

export type PasswordRecord = {
  hash: string;
  salt: string;
  iterations: number;
};

/** Converts bytes to portable base64 without relying on Node-only Buffer APIs. */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function derivePassword(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations,
    },
    passwordKey,
    DERIVED_KEY_BYTES * 8,
  );

  return new Uint8Array(bits);
}

/** Creates a unique salt and a deliberately expensive PBKDF2 password hash. */
export async function hashPassword(password: string): Promise<PasswordRecord> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const derived = await derivePassword(password, salt, PASSWORD_HASH_ROUNDS);

  return {
    hash: bytesToBase64(derived),
    salt: bytesToBase64(salt),
    iterations: PASSWORD_HASH_ROUNDS,
  };
}

/** Uses a constant-work comparison so incorrect bytes do not exit early. */
export async function verifyPassword(
  password: string,
  record: PasswordRecord,
): Promise<boolean> {
  const expected = base64ToBytes(record.hash);
  const actual = await derivePassword(
    password,
    base64ToBytes(record.salt),
    record.iterations,
  );

  if (actual.length !== expected.length) return false;

  let difference = 0;
  for (let index = 0; index < actual.length; index += 1) {
    difference |= actual[index] ^ expected[index];
  }

  return difference === 0;
}

/** One-way hashes an opaque session token before it reaches SQLite. */
export async function hashSessionToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return bytesToBase64(new Uint8Array(digest));
}

/** Session cookies receive the raw random token; SQLite stores only its hash. */
export function createSessionToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return bytesToBase64(bytes)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

export const passwordPolicy = {
  iterations: PASSWORD_HASH_ROUNDS,
  minimumLength: 10,
  maximumLength: 128,
} as const;
