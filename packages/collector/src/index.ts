#!/usr/bin/env node

import { parseArgs, printHelp } from "./cli.js";
import { loadConfig } from "./config.js";
import { runSync } from "./sync/index.js";

async function main() {
  const args = parseArgs(process.argv);

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  try {
    const config = loadConfig();

    console.log("Starting sync...\n");

    const result = await runSync(config, args);

    // Print summary
    console.log("\n" + "=".repeat(50));
    console.log("Sync Summary");
    console.log("=".repeat(50));
    console.log(`Sync Run ID: ${result.syncRunId}`);
    console.log(`Dry Run: ${result.dryRun ? "Yes" : "No"}`);
    console.log();
    console.log("Git Repositories:");
    console.log(`  Processed: ${result.gitReposProcessed}`);
    console.log(`  With Changes: ${result.gitReposSynced}`);
    console.log(`  New Commits: ${result.commitsFound}`);
    console.log();
    console.log("Claude Sessions:");
    console.log(`  Workspaces Processed: ${result.workspacesProcessed}`);
    console.log(`  Workspaces With Changes: ${result.workspacesSynced}`);
    console.log(`  Sessions: ${result.sessionsFound}`);
    console.log(`  New Entries: ${result.entriesFound}`);

    if (result.errors.length > 0) {
      console.log();
      console.log("Errors:");
      result.errors.forEach((e) => console.log(`  - ${e}`));
      process.exit(1);
    }

    console.log();
    console.log(result.dryRun ? "Dry run complete." : "Sync complete.");
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Fatal error: ${error.message}`);
      if (args.verbose) {
        console.error(error.stack);
      }
    } else {
      console.error("Fatal error:", error);
    }
    process.exit(1);
  }
}

main();
