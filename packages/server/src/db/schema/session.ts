import {
  integer,
  pgSchema,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const claudeArchiveSchema = pgSchema("claude_archive");

/**
 * Session - Claude Code sessions (main sessions and agent sessions).
 */
export const session = claudeArchiveSchema.table("session", {
  // Generated ID
  id: uuid("id").defaultRandom().primaryKey(),

  // FK to Workspace
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspace.id),

  // sessionId from JSONL
  originalSessionId: text("original_session_id").notNull(),

  // NULL = main session, SET = agent session
  parentSessionId: uuid("parent_session_id"),

  // 7-char hex for agents
  agentId: text("agent_id"),

  // Original filename
  filename: text("filename").notNull(),

  // Timestamp of first entry
  firstEntryAt: timestamp("first_entry_at", { withTimezone: true }),

  // Timestamp of last entry
  lastEntryAt: timestamp("last_entry_at", { withTimezone: true }),

  // Number of entries
  entryCount: integer("entry_count").default(0),

  // Summary entry text (if present)
  summary: text("summary"),

  // Models used (as TEXT array)
  modelsUsed: text("models_used").array(),

  // Aggregated input tokens
  totalInputTokens: integer("total_input_tokens").default(0),

  // Aggregated output tokens
  totalOutputTokens: integer("total_output_tokens").default(0),

  // Last sync timestamp
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull(),
});

export const sessionRelations = relations(session, ({ one, many }) => ({
  workspace: one(workspace, {
    fields: [session.workspaceId],
    references: [workspace.id],
  }),
  parentSession: one(session, {
    fields: [session.parentSessionId],
    references: [session.id],
    relationName: "parentChild",
  }),
  childSessions: many(session, {
    relationName: "parentChild",
  }),
  entries: many(entry),
}));

// Import after defining session to avoid circular dependency
import { workspace } from "./workspace";
import { entry } from "./entry";

export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;
