import { boolean, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { claudeArchiveSchema } from "./collector";

/**
 * AuthUser - Better Auth user accounts.
 * Stores user identity, email, and optional API key for collector authentication.
 */
export const authUser = claudeArchiveSchema.table("auth_user", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Display name
  name: text("name").notNull(),

  // Email address (unique identifier)
  email: text("email").notNull().unique(),

  // Whether email has been verified
  emailVerified: boolean("email_verified").default(false),

  // Profile image URL
  image: text("image"),

  // API key for collector authentication
  apiKey: text("api_key").unique(),

  // User role: admin, system, user
  role: text("role").default("user"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const authUserRelations = relations(authUser, ({ many }) => ({
  sessions: many(authSession),
  accounts: many(authAccount),
}));

// Import after defining authUser to avoid circular dependency
import { authSession } from "./auth-session";
import { authAccount } from "./auth-account";

export type AuthUser = typeof authUser.$inferSelect;
export type NewAuthUser = typeof authUser.$inferInsert;
