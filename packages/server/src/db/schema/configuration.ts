import { pgSchema, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

export const claudeArchiveSchema = pgSchema("claude_archive");

/**
 * Configuration - Key-Value configuration with categories.
 * Enables dynamic settings without code changes.
 */
export const configuration = claudeArchiveSchema.table(
  "configuration",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    // Namespace/category (e.g., "summary", "ui", "sync")
    category: text("category").notNull(),

    // Configuration key
    key: text("key").notNull(),

    // Type hint for UI (int|datetime|text)
    valueType: text("value_type").notNull().default("text"),

    // Value as text (UI converts based on valueType)
    value: text("value").notNull(),

    // Description for UI
    description: text("description"),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [unique("configuration_category_key_unique").on(table.category, table.key)]
);

export type Configuration = typeof configuration.$inferSelect;
export type NewConfiguration = typeof configuration.$inferInsert;
