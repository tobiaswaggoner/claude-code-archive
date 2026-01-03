import { text, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { claudeArchiveSchema } from "./collector";
import { authUser } from "./auth-user";

/**
 * AuthSession - Better Auth browser sessions.
 * Tracks active user sessions with tokens and metadata.
 */
export const authSession = claudeArchiveSchema.table("auth_session", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Reference to the user
  userId: uuid("user_id")
    .notNull()
    .references(() => authUser.id, { onDelete: "cascade" }),

  // Session token (unique identifier for the session)
  token: text("token").notNull().unique(),

  // When this session expires
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),

  // Client IP address
  ipAddress: text("ip_address"),

  // Browser user agent
  userAgent: text("user_agent"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const authSessionRelations = relations(authSession, ({ one }) => ({
  user: one(authUser, {
    fields: [authSession.userId],
    references: [authUser.id],
  }),
}));

export type AuthSession = typeof authSession.$inferSelect;
export type NewAuthSession = typeof authSession.$inferInsert;
