/**
 * Entry utility functions for analyzing session content.
 *
 * This module provides functions to determine if entries represent "real" user
 * or assistant interactions, used to identify empty sessions.
 */

interface EntryData {
  type: string;
  subtype?: string | null;
  data: Record<string, unknown>;
}

/**
 * Check if an entry data contains a tool_result block in message.content
 */
function hasToolResult(data: Record<string, unknown>): boolean {
  const message = data.message as { content?: unknown } | undefined;
  if (!message?.content) return false;
  if (!Array.isArray(message.content)) return false;
  return message.content.some((item: unknown) => {
    if (typeof item === "object" && item !== null) {
      return (item as { type?: string }).type === "tool_result";
    }
    return false;
  });
}

/**
 * Check if an assistant message contains only tool_use blocks (no text, no thinking)
 */
function hasOnlyToolUse(data: Record<string, unknown>): boolean {
  const message = data.message as { content?: unknown } | undefined;
  if (!message?.content) return false;
  if (!Array.isArray(message.content)) return false;

  const hasToolUse = message.content.some((item: unknown) => {
    if (typeof item === "object" && item !== null) {
      return (item as { type?: string }).type === "tool_use";
    }
    return false;
  });

  const hasText = message.content.some((item: unknown) => {
    if (typeof item === "object" && item !== null) {
      const i = item as { type?: string; text?: string };
      return i.type === "text" && i.text && i.text.trim().length > 0;
    }
    return false;
  });

  return hasToolUse && !hasText;
}

/**
 * Check if an assistant message contains only thinking blocks
 */
function hasOnlyThinking(data: Record<string, unknown>): boolean {
  const message = data.message as { content?: unknown } | undefined;
  if (!message?.content) return false;
  if (!Array.isArray(message.content)) return false;

  const hasThinking = message.content.some((item: unknown) => {
    if (typeof item === "object" && item !== null) {
      return (item as { type?: string }).type === "thinking";
    }
    return false;
  });

  const hasText = message.content.some((item: unknown) => {
    if (typeof item === "object" && item !== null) {
      const i = item as { type?: string; text?: string };
      return i.type === "text" && i.text && i.text.trim().length > 0;
    }
    return false;
  });

  const hasToolUse = message.content.some((item: unknown) => {
    if (typeof item === "object" && item !== null) {
      return (item as { type?: string }).type === "tool_use";
    }
    return false;
  });

  return hasThinking && !hasText && !hasToolUse;
}

/**
 * Check if a user message is a warmup message
 */
function isWarmupMessage(data: Record<string, unknown>): boolean {
  const message = data.message as { content?: unknown } | undefined;
  if (!message?.content) return false;
  if (typeof message.content === "string") {
    return message.content.includes("[Warmup message]");
  }
  return false;
}

/**
 * Determines if an entry is a "real" user entry (actual user input).
 *
 * Returns true for user entries that are NOT:
 * - tool results
 * - meta messages (isMeta)
 * - agent messages (agentId)
 * - warmup messages
 */
export function isRealUserEntry(entry: EntryData): boolean {
  const { type, data } = entry;

  // Must be user/human type
  if (type !== "user" && type !== "human") {
    return false;
  }

  // Exclude tool results
  if (hasToolResult(data)) {
    return false;
  }

  // Exclude meta messages
  if (data.isMeta) {
    return false;
  }

  // Exclude agent messages
  if (data.agentId) {
    return false;
  }

  // Exclude warmup messages
  if (isWarmupMessage(data)) {
    return false;
  }

  return true;
}

/**
 * Determines if an entry is a "real" assistant entry (actual assistant text output).
 *
 * Returns true for assistant entries that contain actual text output,
 * NOT entries that only contain tool_use or thinking blocks.
 */
export function isRealAssistantEntry(entry: EntryData): boolean {
  const { type, data } = entry;

  // Must be assistant type
  if (type !== "assistant") {
    return false;
  }

  // Exclude tool-only responses
  if (hasOnlyToolUse(data)) {
    return false;
  }

  // Exclude thinking-only responses
  if (hasOnlyThinking(data)) {
    return false;
  }

  return true;
}

/**
 * Calculate if a session is "empty" based on its entries.
 *
 * A session is empty if it has no "real" user or assistant entries.
 * "Real" entries are those that represent actual human-AI conversation,
 * excluding tool results, meta messages, warmups, and tool-only assistant responses.
 */
export function calculateIsEmpty(entries: EntryData[]): boolean {
  for (const entry of entries) {
    if (isRealUserEntry(entry)) {
      return false;
    }
    if (isRealAssistantEntry(entry)) {
      return false;
    }
  }
  return true;
}
