import {
  index,
  integer,
  jsonb,
  pgSchema,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const claudeArchiveSchema = pgSchema("claude_archive");

/**
 * Entry - Individual JSONL entries.
 * JSONB for flexible storage, extracted fields for indexing.
 */
export const entry = claudeArchiveSchema.table(
  "entry",
  {
    // Generated ID
    id: uuid("id").defaultRandom().primaryKey(),

    // FK to Session
    sessionId: uuid("session_id")
      .notNull()
      .references(() => session.id),

    // UUID from JSONL (not all entries have one)
    originalUuid: uuid("original_uuid"),

    // Position in JSONL file
    lineNumber: integer("line_number").notNull(),

    // Entry type: user|assistant|summary|system|...
    type: text("type").notNull(),

    // For system entries: stop_hook_summary, etc.
    subtype: text("subtype"),

    // Entry timestamp (not all have one)
    timestamp: timestamp("timestamp", { withTimezone: true }),

    // Complete entry as JSON
    data: jsonb("data").notNull(),
  },
  (table) => [
    // Order within session
    index("entry_session_line_number_idx").on(
      table.sessionId,
      table.lineNumber
    ),
    // Filter by type
    index("entry_session_type_idx").on(table.sessionId, table.type),
    // Time-based search
    index("entry_timestamp_idx").on(table.timestamp),
    // GIN index for JSONB search
    index("entry_data_gin_idx").using("gin", table.data),
  ]
);

export const entryRelations = relations(entry, ({ one, many }) => ({
  session: one(session, {
    fields: [entry.sessionId],
    references: [session.id],
  }),
  toolResults: many(toolResult),
}));

// Import after defining entry to avoid circular dependency
import { session } from "./session";
import { toolResult } from "./tool-result";

export type Entry = typeof entry.$inferSelect;
export type NewEntry = typeof entry.$inferInsert;
