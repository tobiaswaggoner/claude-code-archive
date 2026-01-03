import { z } from "zod";
import {
  EntrySchema,
  ExtendedEntrySchema,
  type Entry,
  type ExtendedEntry,
  UserEntrySchema,
  AssistantEntrySchema,
  SummaryEntrySchema,
  FileHistorySnapshotEntrySchema,
} from "../types/entries.js";

// ============================================================
// PARSE OPTIONS
// ============================================================

export interface ParseOptions {
  /** Skip invalid lines instead of including error entries */
  skipInvalid?: boolean;
  /** Only parse specific entry types */
  filterTypes?: Array<Entry["type"]>;
  /** Include file-history-snapshot entries (default: false) */
  includeSnapshots?: boolean;
}

// ============================================================
// PARSE RESULT
// ============================================================

export interface ParseResult {
  /** Successfully parsed entries */
  entries: Entry[];
  /** Parse errors (if skipInvalid is false) */
  errors: Array<{
    lineNumber: number;
    line: string;
    error: string;
  }>;
  /** Metadata extracted from entries */
  metadata: SessionMetadata;
}

export interface SessionMetadata {
  sessionId: string | null;
  firstTimestamp: string | null;
  lastTimestamp: string | null;
  cwd: string | null;
  version: string | null;
  gitBranch: string | null;
  summary: string | null;
  messageCount: number;
  userMessageCount: number;
  assistantMessageCount: number;
  toolUseCount: number;
  models: string[];
}

// ============================================================
// LOOSE SCHEMA (for initial parsing)
// ============================================================

/**
 * Loose schema that accepts any object with a type field.
 * Used for initial parsing before strict validation.
 */
const LooseEntrySchema = z.object({
  type: z.string(),
}).passthrough();

// ============================================================
// PARSER FUNCTIONS
// ============================================================

/**
 * Parse a single JSONL line into an entry.
 */
export function parseLine(line: string, lineNumber: number): ExtendedEntry {
  const trimmed = line.trim();
  if (!trimmed) {
    return {
      type: "x-parse-error",
      line,
      lineNumber,
      error: "Empty line",
    };
  }

  try {
    const parsed = JSON.parse(trimmed);

    // Try to validate with strict schema
    const result = EntrySchema.safeParse(parsed);
    if (result.success) {
      return result.data;
    }

    // If strict parsing fails, try loose parsing to get type info
    const looseResult = LooseEntrySchema.safeParse(parsed);
    if (looseResult.success) {
      // Check if it's a known type that we're intentionally skipping
      const knownSkippedTypes = ["file-history-snapshot"];
      if (knownSkippedTypes.includes(looseResult.data.type)) {
        // Try file-history-snapshot schema
        const snapshotResult = FileHistorySnapshotEntrySchema.safeParse(parsed);
        if (snapshotResult.success) {
          return snapshotResult.data as unknown as ExtendedEntry;
        }
      }
    }

    // Return error with Zod validation message
    return {
      type: "x-parse-error",
      line,
      lineNumber,
      error: result.error.message,
    };
  } catch (e) {
    return {
      type: "x-parse-error",
      line,
      lineNumber,
      error: e instanceof Error ? e.message : "Unknown parse error",
    };
  }
}

/**
 * Parse JSONL content into entries with metadata extraction.
 */
export function parseJsonl(content: string, options: ParseOptions = {}): ParseResult {
  const {
    skipInvalid = false,
    filterTypes,
    includeSnapshots = false,
  } = options;

  const lines = content.split("\n");
  const entries: Entry[] = [];
  const errors: ParseResult["errors"] = [];
  const modelsSet = new Set<string>();

  const metadata: SessionMetadata = {
    sessionId: null,
    firstTimestamp: null,
    lastTimestamp: null,
    cwd: null,
    version: null,
    gitBranch: null,
    summary: null,
    messageCount: 0,
    userMessageCount: 0,
    assistantMessageCount: 0,
    toolUseCount: 0,
    models: [],
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const lineNumber = i + 1;
    const result = parseLine(line, lineNumber);

    // Handle parse errors
    if (result.type === "x-parse-error") {
      if (!skipInvalid) {
        errors.push({
          lineNumber: result.lineNumber,
          line: result.line,
          error: result.error,
        });
      }
      continue;
    }

    // Skip file-history-snapshot unless explicitly included
    if (result.type === "file-history-snapshot" && !includeSnapshots) {
      continue;
    }

    // Apply type filter
    if (filterTypes && !filterTypes.includes(result.type)) {
      continue;
    }

    // Extract metadata
    extractMetadata(result, metadata, modelsSet);

    entries.push(result);
  }

  metadata.models = Array.from(modelsSet);
  metadata.messageCount = entries.length;

  return { entries, errors, metadata };
}

/**
 * Extract metadata from an entry.
 */
function extractMetadata(
  entry: Entry,
  metadata: SessionMetadata,
  modelsSet: Set<string>
): void {
  // Extract from base entry fields
  if ("sessionId" in entry && entry.sessionId && !metadata.sessionId) {
    metadata.sessionId = entry.sessionId;
  }
  if ("cwd" in entry && entry.cwd && !metadata.cwd) {
    metadata.cwd = entry.cwd;
  }
  if ("version" in entry && entry.version && !metadata.version) {
    metadata.version = entry.version;
  }
  if ("gitBranch" in entry && entry.gitBranch && !metadata.gitBranch) {
    metadata.gitBranch = entry.gitBranch;
  }
  if ("timestamp" in entry && entry.timestamp) {
    if (!metadata.firstTimestamp || entry.timestamp < metadata.firstTimestamp) {
      metadata.firstTimestamp = entry.timestamp;
    }
    if (!metadata.lastTimestamp || entry.timestamp > metadata.lastTimestamp) {
      metadata.lastTimestamp = entry.timestamp;
    }
  }

  // Entry-type specific extraction
  switch (entry.type) {
    case "summary":
      if (!metadata.summary) {
        metadata.summary = entry.summary;
      }
      break;

    case "user":
      metadata.userMessageCount++;
      break;

    case "assistant":
      metadata.assistantMessageCount++;
      if (entry.message.model) {
        modelsSet.add(entry.message.model);
      }
      // Count tool uses
      for (const content of entry.message.content) {
        if (content.type === "tool_use") {
          metadata.toolUseCount++;
        }
      }
      break;
  }
}

/**
 * Parse JSONL file from file system (Node.js only).
 */
export async function parseJsonlFile(
  filePath: string,
  options: ParseOptions = {}
): Promise<ParseResult> {
  const { readFile } = await import("node:fs/promises");
  const content = await readFile(filePath, "utf-8");
  return parseJsonl(content, options);
}

/**
 * Stream-parse large JSONL files line by line.
 */
export async function* streamParseJsonl(
  filePath: string,
  options: ParseOptions = {}
): AsyncGenerator<ExtendedEntry> {
  const { createReadStream } = await import("node:fs");
  const { createInterface } = await import("node:readline");

  const { filterTypes, includeSnapshots = false } = options;

  const rl = createInterface({
    input: createReadStream(filePath),
    crlfDelay: Infinity,
  });

  let lineNumber = 0;
  for await (const line of rl) {
    lineNumber++;
    if (!line.trim()) continue;

    const result = parseLine(line, lineNumber);

    // Skip errors if needed
    if (result.type === "x-parse-error") {
      continue;
    }

    // Skip file-history-snapshot unless explicitly included
    if (result.type === "file-history-snapshot" && !includeSnapshots) {
      continue;
    }

    // Apply type filter
    if (filterTypes && !filterTypes.includes(result.type)) {
      continue;
    }

    yield result;
  }
}
