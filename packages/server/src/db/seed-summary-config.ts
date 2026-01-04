/**
 * Seed script for summary configuration.
 *
 * Run with: pnpm db:seed-summary
 */

import { db } from "./connection.js";
import { configuration } from "./schema/index.js";

const DEFAULT_PROMPT_TEMPLATE = `Du analysierst Claude Code Konversationen.

## Projekt
- Name: {{project.name}}
- Beschreibung: {{project.description}}

## Session
- Start: {{session.startedAt}}
- Branch: {{session.branch}}
- Modelle: {{session.models}}

## Vorherige Sessions
{{history}}

## Aktuelle Konversation
{{conversation}}

{{#if userInstructions}}
## Zusätzliche Anweisungen
{{userInstructions}}
{{/if}}

Erstelle eine prägnante Zusammenfassung (2-3 Sätze):
1. Hauptziel
2. Wichtige Änderungen
3. Offene Punkte`;

const summaryConfigs = [
  {
    category: "summary",
    key: "prompt_template",
    valueType: "text",
    value: DEFAULT_PROMPT_TEMPLATE,
    description: "Prompt template for summary generation. Supports placeholders.",
  },
  {
    category: "summary",
    key: "model",
    valueType: "text",
    value: "moonshotai/kimi-k2-0905",
    description: "OpenRouter model ID for summary generation",
  },
  {
    category: "summary",
    key: "max_tokens",
    valueType: "int",
    value: "1000",
    description: "Maximum tokens for summary response",
  },
  {
    category: "summary",
    key: "history_count",
    valueType: "int",
    value: "3",
    description: "Number of previous session summaries to include as context",
  },
  {
    category: "summary",
    key: "temperature",
    valueType: "text",
    value: "0.3",
    description: "LLM temperature for summary generation",
  },
];

async function seed() {
  console.log("Seeding summary configuration...");

  for (const config of summaryConfigs) {
    try {
      await db
        .insert(configuration)
        .values(config)
        .onConflictDoNothing();
      console.log(`  ✓ ${config.category}/${config.key}`);
    } catch (error) {
      console.error(`  ✗ ${config.category}/${config.key}:`, error);
    }
  }

  console.log("Done!");
  process.exit(0);
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
