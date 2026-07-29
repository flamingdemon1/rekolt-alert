import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * Shop accounts store only a salted password derivation. The original password
 * is never written to SQLite or application logs.
 */
export const shopUsers = sqliteTable(
  "shop_users",
  {
    id: text("id").primaryKey(),
    username: text("username").notNull(),
    usernameNormalized: text("username_normalized").notNull(),
    passwordHash: text("password_hash").notNull(),
    passwordSalt: text("password_salt").notNull(),
    passwordIterations: integer("password_iterations").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("shop_users_username_normalized_unique").on(
      table.usernameNormalized,
    ),
  ],
);

/** Session tokens are hashed before storage and expire after seven days. */
export const shopSessions = sqliteTable(
  "shop_sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => shopUsers.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("shop_sessions_token_hash_unique").on(table.tokenHash),
  ],
);
