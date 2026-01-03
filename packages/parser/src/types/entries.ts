import { z } from "zod";
import { UserMessageSchema, AssistantMessageSchema } from "./messages.js";
import { ContentItemSchema } from "./content.js";

// ============================================================
// BASE ENTRY SCHEMA
// ============================================================

/** Common fields for most entry types */
export const BaseEntrySchema = z.object({
  uuid: z.string().uuid(),
  parentUuid: z.string().uuid().nullable(),
  timestamp: z.string(), // ISO 8601
  sessionId: z.string(),
  cwd: z.string(),
  version: z.string(),
  isSidechain: z.boolean(),
  userType: z.literal("external"),

  // Optional fields
  gitBranch: z.string().optional(),
  isMeta: z.boolean().optional(),
  agentId: z.string().optional(),
  toolUseResult: z.unknown().optional(),
  isCompactSummary: z.boolean().optional(),
});
export type BaseEntry = z.infer<typeof BaseEntrySchema>;

// ============================================================
// ENTRY SCHEMAS
// ============================================================

/** User entry - user messages and tool results */
export const UserEntrySchema = BaseEntrySchema.extend({
  type: z.literal("user"),
  message: UserMessageSchema,
});
export type UserEntry = z.infer<typeof UserEntrySchema>;

/** Assistant entry - Claude responses */
export const AssistantEntrySchema = BaseEntrySchema.extend({
  type: z.literal("assistant"),
  message: AssistantMessageSchema,
  requestId: z.string().optional(),
  isApiErrorMessage: z.boolean().optional(),
});
export type AssistantEntry = z.infer<typeof AssistantEntrySchema>;

/** Summary entry - session summary (no base fields) */
export const SummaryEntrySchema = z.object({
  type: z.literal("summary"),
  summary: z.string(),
  leafUuid: z.string().uuid(),
  cwd: z.string().optional(),
  sessionId: z.null().optional(),
});
export type SummaryEntry = z.infer<typeof SummaryEntrySchema>;

/** Hook info for system entries */
export const HookInfoSchema = z.object({
  command: z.string(),
});

/** System entry with content */
export const SystemEntryWithContentSchema = BaseEntrySchema.extend({
  type: z.literal("system"),
  content: z.string(),
  toolUseID: z.string(),
  level: z.literal("info"),
  subtype: z.undefined().optional(),
});

/** Stop hook summary system entry */
export const StopHookSummaryEntrySchema = BaseEntrySchema.extend({
  type: z.literal("system"),
  subtype: z.literal("stop_hook_summary"),
  toolUseID: z.string(),
  level: z.enum(["info", "suggestion"]),
  slug: z.string().optional(),
  hookCount: z.number(),
  hookInfos: z.array(HookInfoSchema),
  hookErrors: z.array(z.unknown()),
  preventedContinuation: z.boolean(),
  stopReason: z.string(),
  hasOutput: z.boolean(),
});

/** Local command system entry */
export const LocalCommandEntrySchema = BaseEntrySchema.extend({
  type: z.literal("system"),
  subtype: z.literal("local_command"),
  content: z.string(),
  level: z.literal("info"),
});

/** Compact boundary metadata */
export const CompactMetadataSchema = z.object({
  trigger: z.string(),
  preTokens: z.number(),
});

/** Compact boundary system entry (conversation was compacted) */
export const CompactBoundaryEntrySchema = BaseEntrySchema.extend({
  type: z.literal("system"),
  subtype: z.literal("compact_boundary"),
  content: z.string(),
  level: z.literal("info"),
  slug: z.string().optional(),
  logicalParentUuid: z.string().uuid().nullable().optional(),
  compactMetadata: CompactMetadataSchema.optional(),
});

/** Union of all system entry types */
export const SystemEntrySchema = z.union([
  SystemEntryWithContentSchema,
  StopHookSummaryEntrySchema,
  LocalCommandEntrySchema,
  CompactBoundaryEntrySchema,
]);
export type SystemEntry = z.infer<typeof SystemEntrySchema>;

/** File history snapshot entry */
export const FileHistorySnapshotEntrySchema = z.object({
  type: z.literal("file-history-snapshot"),
  messageId: z.string(),
  snapshot: z.object({
    messageId: z.string(),
    trackedFileBackups: z.record(z.string(), z.unknown()),
    timestamp: z.string(),
  }),
  isSnapshotUpdate: z.boolean(),
});
export type FileHistorySnapshotEntry = z.infer<typeof FileHistorySnapshotEntrySchema>;

/** Queue operation content */
export const QueueOperationContentSchema = z.union([
  z.string(),
  z.array(ContentItemSchema),
]);

/** Queue operation entry (enqueue) */
export const EnqueueOperationSchema = z.object({
  type: z.literal("queue-operation"),
  operation: z.literal("enqueue"),
  content: QueueOperationContentSchema,
  sessionId: z.string(),
  timestamp: z.string(),
});

/** Queue operation entry (dequeue/remove) */
export const DequeueOperationSchema = z.object({
  type: z.literal("queue-operation"),
  operation: z.enum(["dequeue", "remove", "popAll"]),
  sessionId: z.string(),
  timestamp: z.string(),
});

/** Union of queue operation types */
export const QueueOperationEntrySchema = z.union([
  EnqueueOperationSchema,
  DequeueOperationSchema,
]);
export type QueueOperationEntry = z.infer<typeof QueueOperationEntrySchema>;

// ============================================================
// MAIN ENTRY UNION
// ============================================================

/** Queue operation union (same type, different operations) */
export const QueueOperationSchema = z.union([
  EnqueueOperationSchema,
  DequeueOperationSchema,
]);

/**
 * All possible entry types in a JSONL file.
 * Uses regular union because some types share the same `type` field value
 * (e.g., system entries, queue-operation entries).
 */
export const EntrySchema = z.union([
  UserEntrySchema,
  AssistantEntrySchema,
  SummaryEntrySchema,
  SystemEntrySchema, // Union of all system variants
  FileHistorySnapshotEntrySchema,
  QueueOperationSchema, // Union of queue operations
]);
export type Entry = z.infer<typeof EntrySchema>;

/** Extended entry that includes parse errors */
export const ExtendedEntrySchema = z.union([
  EntrySchema,
  z.object({
    type: z.literal("x-parse-error"),
    line: z.string(),
    lineNumber: z.number(),
    error: z.string(),
  }),
]);
export type ExtendedEntry = z.infer<typeof ExtendedEntrySchema>;
