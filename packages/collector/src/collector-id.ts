import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const COLLECTOR_ID_PATH = join(homedir(), ".claude-archive", "collector-id");

/**
 * Get the existing collector ID or return null if not found.
 */
export function getCollectorId(): string | null {
  if (!existsSync(COLLECTOR_ID_PATH)) {
    return null;
  }

  try {
    const id = readFileSync(COLLECTOR_ID_PATH, "utf-8").trim();
    // Basic UUID validation
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return id;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get the existing collector ID or create a new one if not found.
 */
export function getOrCreateCollectorId(): string {
  const existing = getCollectorId();
  if (existing) {
    return existing;
  }

  const newId = randomUUID();
  const dir = dirname(COLLECTOR_ID_PATH);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(COLLECTOR_ID_PATH, newId, "utf-8");
  return newId;
}
