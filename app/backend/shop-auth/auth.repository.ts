import { getRuntimeDatabase } from "../../../db/runtime";

export type StoredShopUser = {
  id: string;
  username: string;
  usernameNormalized: string;
  passwordHash: string;
  passwordSalt: string;
  passwordIterations: number;
};

export type ShopSessionUser = {
  id: string;
  username: string;
  expiresAt: number;
};

let schemaPromise: Promise<void> | null = null;

function getDatabase(): D1Database {
  return getRuntimeDatabase();
}

/**
 * Runtime-safe initialization keeps first local use simple. The generated
 * migration remains the authoritative production schema.
 */
async function ensureAuthSchema(): Promise<void> {
  if (!schemaPromise) {
    const database = getDatabase();
    schemaPromise = database
      .batch([
        database.prepare(`
          CREATE TABLE IF NOT EXISTS shop_users (
            id TEXT PRIMARY KEY NOT NULL,
            username TEXT NOT NULL,
            username_normalized TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            password_salt TEXT NOT NULL,
            password_iterations INTEGER NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `),
        database.prepare(`
          CREATE UNIQUE INDEX IF NOT EXISTS shop_users_username_normalized_unique
          ON shop_users (username_normalized)
        `),
        database.prepare(`
          CREATE TABLE IF NOT EXISTS shop_sessions (
            token_hash TEXT PRIMARY KEY NOT NULL,
            user_id TEXT NOT NULL,
            expires_at INTEGER NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES shop_users(id) ON DELETE CASCADE
          )
        `),
        database.prepare(`
          CREATE UNIQUE INDEX IF NOT EXISTS shop_sessions_token_hash_unique
          ON shop_sessions (token_hash)
        `),
      ])
      .then(() => undefined)
      .catch((error: unknown) => {
        schemaPromise = null;
        throw error;
      });
  }

  await schemaPromise;
}

export async function findUserByUsername(
  usernameNormalized: string,
): Promise<StoredShopUser | null> {
  await ensureAuthSchema();
  return getDatabase()
    .prepare(
      `SELECT
        id,
        username,
        username_normalized AS usernameNormalized,
        password_hash AS passwordHash,
        password_salt AS passwordSalt,
        password_iterations AS passwordIterations
      FROM shop_users
      WHERE username_normalized = ?
      LIMIT 1`,
    )
    .bind(usernameNormalized)
    .first<StoredShopUser>();
}

export async function insertShopUser(user: StoredShopUser): Promise<void> {
  await ensureAuthSchema();
  await getDatabase()
    .prepare(
      `INSERT INTO shop_users (
        id,
        username,
        username_normalized,
        password_hash,
        password_salt,
        password_iterations
      ) VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      user.id,
      user.username,
      user.usernameNormalized,
      user.passwordHash,
      user.passwordSalt,
      user.passwordIterations,
    )
    .run();
}

export async function insertShopSession(
  tokenHash: string,
  userId: string,
  expiresAt: number,
): Promise<void> {
  await ensureAuthSchema();
  const database = getDatabase();

  await database.batch([
    database
      .prepare("DELETE FROM shop_sessions WHERE expires_at <= ?")
      .bind(Math.floor(Date.now() / 1000)),
    database
      .prepare(
        "INSERT INTO shop_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
      )
      .bind(tokenHash, userId, expiresAt),
  ]);
}

export async function findUserBySessionHash(
  tokenHash: string,
): Promise<ShopSessionUser | null> {
  await ensureAuthSchema();
  return getDatabase()
    .prepare(
      `SELECT
        users.id AS id,
        users.username AS username,
        sessions.expires_at AS expiresAt
      FROM shop_sessions AS sessions
      INNER JOIN shop_users AS users ON users.id = sessions.user_id
      WHERE sessions.token_hash = ? AND sessions.expires_at > ?
      LIMIT 1`,
    )
    .bind(tokenHash, Math.floor(Date.now() / 1000))
    .first<ShopSessionUser>();
}

export async function deleteShopSession(tokenHash: string): Promise<void> {
  await ensureAuthSchema();
  await getDatabase()
    .prepare("DELETE FROM shop_sessions WHERE token_hash = ?")
    .bind(tokenHash)
    .run();
}
