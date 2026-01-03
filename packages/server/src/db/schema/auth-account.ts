import { text, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { claudeArchiveSchema } from "./collector";
import { authUser } from "./auth-user";

/**
 * AuthAccount - Better Auth OAuth/credential accounts.
 * Links external providers (Google, GitHub, etc.) or email/password to users.
 */
export const authAccount = claudeArchiveSchema.table("auth_account", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Reference to the user
  userId: uuid("user_id")
    .notNull()
    .references(() => authUser.id, { onDelete: "cascade" }),

  // Provider-specific account ID
  accountId: text("account_id").notNull(),

  // Provider identifier (e.g., "google", "github", "credential")
  providerId: text("provider_id").notNull(),

  // OAuth access token
  accessToken: text("access_token"),

  // OAuth refresh token
  refreshToken: text("refresh_token"),

  // When access token expires
  accessTokenExpiresAt: timestamp("access_token_expires_at", {
    withTimezone: true,
  }),

  // When refresh token expires
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
    withTimezone: true,
  }),

  // OAuth scope
  scope: text("scope"),

  // OpenID Connect ID token
  idToken: text("id_token"),

  // Hashed password for email/password auth
  password: text("password"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const authAccountRelations = relations(authAccount, ({ one }) => ({
  user: one(authUser, {
    fields: [authAccount.userId],
    references: [authUser.id],
  }),
}));

export type AuthAccount = typeof authAccount.$inferSelect;
export type NewAuthAccount = typeof authAccount.$inferInsert;
