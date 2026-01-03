import {
  boolean,
  customType,
  integer,
  pgSchema,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const claudeArchiveSchema = pgSchema("claude_archive");

// Custom type for BYTEA
const bytea = customType<{ data: Buffer; notNull: false; default: false }>({
  dataType() {
    return "bytea";
  },
});

/**
 * ToolResult - Large tool outputs (screenshots, long texts).
 * Corresponds to the `tool-results/` files.
 */
export const toolResult = claudeArchiveSchema.table(
  "tool_result",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    // FK to Entry (user entry with tool_result)
    entryId: uuid("entry_id")
      .notNull()
      .references(() => entry.id),

    // Tool-Use ID (e.g., `toolu_01ABC...`)
    toolUseId: text("tool_use_id").notNull(),

    // Tool name: Read, Bash, WebFetch, etc.
    toolName: text("tool_name").notNull(),

    // MIME type
    contentType: text("content_type").notNull(),

    // Text content (if text/*)
    contentText: text("content_text"),

    // Binary content (if image/*, etc.)
    contentBinary: bytea("content_binary"),

    // Size in bytes
    sizeBytes: integer("size_bytes").notNull(),

    // Tool error
    isError: boolean("is_error").default(false),

    // Creation timestamp
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    // Unique constraint: one result per entry + tool_use_id combination
    unique("tool_result_entry_tool_use_id_unique").on(
      table.entryId,
      table.toolUseId
    ),
  ]
);

export const toolResultRelations = relations(toolResult, ({ one }) => ({
  entry: one(entry, {
    fields: [toolResult.entryId],
    references: [entry.id],
  }),
}));

// Import after defining toolResult to avoid circular dependency
import { entry } from "./entry";

export type ToolResult = typeof toolResult.$inferSelect;
export type NewToolResult = typeof toolResult.$inferInsert;
