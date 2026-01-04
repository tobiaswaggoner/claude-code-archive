/**
 * Regenerate summaries for all sessions.
 *
 * Run with: pnpm tsx --env-file=.env src/scripts/regenerate-summaries.ts
 */

import { db } from "../db/connection.js";
import { session } from "../db/schema/index.js";
import { isNull } from "drizzle-orm";
import { createSummaryGenerator, isSummaryAvailable } from "../services/summary/index.js";

const DELAY_BETWEEN_REQUESTS_MS = 500; // Rate limiting

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("=== Regenerate All Session Summaries ===\n");

  if (!isSummaryAvailable()) {
    console.error("ERROR: OpenRouter not configured!");
    console.error("Set OPENROUTER_API_URL and OPENROUTER_API_KEY environment variables.");
    process.exit(1);
  }

  // Get all main sessions (no agent sessions)
  const sessions = await db
    .select({ id: session.id, originalSessionId: session.originalSessionId })
    .from(session)
    .where(isNull(session.parentSessionId));

  console.log(`Found ${sessions.length} main sessions to process.\n`);

  const generator = createSummaryGenerator(db);

  let processed = 0;
  let skipped = 0;
  let errors = 0;
  let empty = 0;

  for (const s of sessions) {
    processed++;
    const progress = `[${processed}/${sessions.length}]`;

    try {
      const result = await generator.generate({ sessionId: s.id });

      if (result.model === "none") {
        empty++;
        console.log(`${progress} ${s.originalSessionId.slice(0, 8)}... → Leere Session`);
      } else {
        const summaryPreview = result.summary.slice(0, 60).replace(/\n/g, " ");
        console.log(`${progress} ${s.originalSessionId.slice(0, 8)}... → ${summaryPreview}...`);
      }
    } catch (error) {
      errors++;
      console.error(`${progress} ${s.originalSessionId.slice(0, 8)}... → ERROR: ${error}`);
    }

    // Rate limiting
    if (processed < sessions.length) {
      await sleep(DELAY_BETWEEN_REQUESTS_MS);
    }
  }

  console.log("\n=== Done ===");
  console.log(`Processed: ${processed}`);
  console.log(`Empty sessions: ${empty}`);
  console.log(`Errors: ${errors}`);

  process.exit(0);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
