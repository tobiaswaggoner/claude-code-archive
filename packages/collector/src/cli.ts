import minimist from "minimist";

export interface CliArgs {
  sourceDirs: string[];
  verbose: boolean;
  dryRun: boolean;
  help: boolean;
}

export function parseArgs(argv: string[]): CliArgs {
  const args = minimist(argv.slice(2), {
    string: ["source-dir", "s"],
    boolean: ["verbose", "v", "dry-run", "help", "h"],
    alias: {
      s: "source-dir",
      v: "verbose",
      h: "help",
    },
  });

  // Collect source directories from both -s and --source-dir
  const sourceDirs: string[] = [];
  const sourceDir = args["source-dir"];
  if (Array.isArray(sourceDir)) {
    sourceDirs.push(...sourceDir);
  } else if (sourceDir) {
    sourceDirs.push(sourceDir);
  }

  return {
    sourceDirs,
    verbose: args.verbose || args.v || false,
    dryRun: args["dry-run"] || false,
    help: args.help || args.h || false,
  };
}

export function printHelp(): void {
  console.log(`
@claude-archive/collector - Sync Claude Code sessions to archive server

USAGE:
  collector [OPTIONS]

OPTIONS:
  -s, --source-dir=PATH   Source directory to scan for sessions (can be repeated)
  -v, --verbose           Enable verbose output
      --dry-run           Show what would be synced without actually syncing
  -h, --help              Show this help message

ENVIRONMENT VARIABLES:
  CLAUDE_ARCHIVE_SERVER_URL     (required) Server base URL
  CLAUDE_ARCHIVE_API_KEY        (required) API key for authentication
  CLAUDE_ARCHIVE_COLLECTOR_NAME (optional) Collector name (default: hostname)
  CLAUDE_ARCHIVE_LOG_LEVEL      (optional) Log level: debug, info, warn, error (default: info)

EXAMPLES:
  # Sync from default Claude Code directory
  collector

  # Sync from specific directories
  collector -s /home/user/.claude -s /home/user/projects/.claude

  # Preview sync without making changes
  collector --dry-run -v

  # Verbose output
  collector -v
`);
}
