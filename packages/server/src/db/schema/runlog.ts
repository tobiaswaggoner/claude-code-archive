import {
  index,
  jsonb,
  pgSchema,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const claudeArchiveSchema = pgSchema("claude_archive");

/**
 * RunLog - Log entries for sync runs.
 * Enables debugging and monitoring of collector sync operations.
 */
export const runLog = claudeArchiveSchema.table(
  "run_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    // FK to Collector
    collectorId: uuid("collector_id")
      .notNull()
      .references(() => collector.id),

    // Groups logs of a single sync run
    syncRunId: uuid("sync_run_id").notNull(),

    // Log timestamp
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),

    // Log level: debug, info, warn, error
    level: text("level").notNull(),

    // Log message
    message: text("message").notNull(),

    // Additional data (file, count, duration, etc.)
    context: jsonb("context"),
  },
  (table) => [
    // Logs of a single run
    index("run_log_collector_sync_run_idx").on(
      table.collectorId,
      table.syncRunId
    ),
    // Time-based search
    index("run_log_collector_timestamp_idx").on(
      table.collectorId,
      table.timestamp
    ),
    // Filter by level
    index("run_log_level_idx").on(table.level),
  ]
);

export const runLogRelations = relations(runLog, ({ one }) => ({
  collector: one(collector, {
    fields: [runLog.collectorId],
    references: [collector.id],
  }),
}));

// Import after defining runLog to avoid circular dependency
import { collector } from "./collector";

export type RunLog = typeof runLog.$inferSelect;
export type NewRunLog = typeof runLog.$inferInsert;
