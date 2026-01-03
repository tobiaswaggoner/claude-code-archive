import { text, timestamp, uuid } from "drizzle-orm/pg-core";
import { claudeArchiveSchema } from "./collector";

/**
 * AuthVerification - Better Auth verification tokens.
 * Stores tokens for email verification, password reset, etc.
 */
export const authVerification = claudeArchiveSchema.table("auth_verification", {
  id: uuid("id").defaultRandom().primaryKey(),

  // What is being verified (e.g., email address)
  identifier: text("identifier").notNull(),

  // Verification token value
  value: text("value").notNull(),

  // When this verification expires
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .$defaultFn(() => new Date()),
});

// No relations needed for verification tokens

export type AuthVerification = typeof authVerification.$inferSelect;
export type NewAuthVerification = typeof authVerification.$inferInsert;
