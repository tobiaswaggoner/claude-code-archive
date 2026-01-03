/**
 * Tool results loading module.
 * Loads and processes tool result files from Claude session directories.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { SyncToolResult } from "../api/types.js";

/**
 * Image result structure from tool results.
 */
interface ImageResult {
  type: "image";
  source: {
    type: "base64";
    data: string;
    media_type: string;
  };
}

/**
 * Check if a result is an image result.
 */
function isImageResult(result: unknown): result is ImageResult {
  if (typeof result !== "object" || result === null) {
    return false;
  }
  const obj = result as Record<string, unknown>;
  if (obj.type !== "image") {
    return false;
  }
  if (typeof obj.source !== "object" || obj.source === null) {
    return false;
  }
  const source = obj.source as Record<string, unknown>;
  return (
    source.type === "base64" &&
    typeof source.data === "string" &&
    typeof source.media_type === "string"
  );
}

/**
 * Load a tool result from the tool-results directory.
 *
 * @param toolResultsDir - Path to the tool-results directory
 * @param toolUseId - The tool use ID (corresponds to filename without extension)
 * @returns The parsed tool result, or null if not found or parse error
 */
export async function loadToolResult(
  toolResultsDir: string,
  toolUseId: string
): Promise<SyncToolResult | null> {
  const filePath = join(toolResultsDir, `${toolUseId}.json`);

  try {
    const content = await readFile(filePath, "utf-8");
    const parsed = JSON.parse(content);

    // The tool result file structure contains:
    // - toolName: string
    // - result: the actual result content
    // - isError: boolean (optional)
    const toolName = parsed.toolName || "unknown";
    const result = parsed.result;
    const isError = parsed.isError === true;

    let contentType: string;
    let contentText: string | null = null;
    let contentBinary: string | null = null;
    let sizeBytes: number;

    if (typeof result === "string") {
      // Plain text result
      contentType = "text/plain";
      contentText = result;
      sizeBytes = Buffer.byteLength(result, "utf-8");
    } else if (isImageResult(result)) {
      // Image result with base64 data
      contentType = result.source.media_type;
      contentBinary = result.source.data;
      // Base64 encodes 3 bytes into 4 characters
      sizeBytes = Math.ceil((result.source.data.length * 3) / 4);
    } else {
      // Object/array result - serialize to JSON
      contentType = "application/json";
      contentText = JSON.stringify(result);
      sizeBytes = Buffer.byteLength(contentText, "utf-8");
    }

    return {
      toolUseId,
      toolName,
      contentType,
      contentText,
      contentBinary,
      sizeBytes,
      isError,
    };
  } catch {
    // File doesn't exist or parse error
    return null;
  }
}
