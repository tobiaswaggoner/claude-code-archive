import type { Entry } from "../../db/schema/index.js";
import type { ExtractedMessage, IContentExtractor } from "./types.js";

/**
 * Extracts relevant conversation content from Entry data.
 *
 * Filter rules:
 * - Only type === "user" or type === "assistant"
 * - Assistant: only content.type === "text" (no thinking, no tool_use)
 * - User: only text content (no tool_results)
 */
export class ContentExtractor implements IContentExtractor {
  extractConversation(entries: Entry[]): ExtractedMessage[] {
    const messages: ExtractedMessage[] = [];

    for (const entry of entries) {
      if (entry.type !== "user" && entry.type !== "assistant") {
        continue;
      }

      const data = entry.data as Record<string, unknown>;
      const message = data.message as Record<string, unknown> | undefined;

      if (!message) continue;

      const content = message.content;

      if (entry.type === "user") {
        const text = this.extractUserText(content);
        if (text) {
          messages.push({ role: "user", content: text });
        }
      } else if (entry.type === "assistant") {
        const text = this.extractAssistantText(content);
        if (text) {
          messages.push({ role: "assistant", content: text });
        }
      }
    }

    return messages;
  }

  formatConversation(messages: ExtractedMessage[]): string {
    return messages
      .map((m) => `### ${m.role === "user" ? "User" : "Assistant"}\n${m.content}`)
      .join("\n\n");
  }

  private extractUserText(content: unknown): string | null {
    // String content
    if (typeof content === "string") {
      return content;
    }

    // Array content - only text, no tool_results
    if (Array.isArray(content)) {
      const textParts: string[] = [];
      for (const item of content) {
        if (typeof item === "string") {
          textParts.push(item);
        } else if (item && typeof item === "object" && "type" in item) {
          const typedItem = item as { type: string; text?: string };
          if (typedItem.type === "text" && typedItem.text) {
            textParts.push(typedItem.text);
          }
          // tool_result is ignored
        }
      }
      return textParts.length > 0 ? textParts.join("\n") : null;
    }

    return null;
  }

  private extractAssistantText(content: unknown): string | null {
    // Array content - only text, no thinking/tool_use
    if (Array.isArray(content)) {
      const textParts: string[] = [];
      for (const item of content) {
        if (item && typeof item === "object" && "type" in item) {
          const typedItem = item as { type: string; text?: string };
          if (typedItem.type === "text" && typedItem.text) {
            textParts.push(typedItem.text);
          }
          // thinking and tool_use are ignored
        }
      }
      return textParts.length > 0 ? textParts.join("\n") : null;
    }

    return null;
  }
}
