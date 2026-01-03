import { readdir, stat } from "node:fs/promises";
import { join, basename } from "node:path";
import { homedir } from "node:os";
import { parseJsonlFile, type ParseResult } from "./jsonl.js";

// ============================================================
// SESSION TYPES
// ============================================================

export interface SessionFile {
  /** Full path to the JSONL file */
  path: string;
  /** Session ID (filename without extension) */
  sessionId: string;
  /** File modification time */
  mtime: Date;
  /** File size in bytes */
  size: number;
  /** Whether this is an agent file */
  isAgent: boolean;
  /** Agent ID (if isAgent is true) */
  agentId?: string;
}

export interface ProjectInfo {
  /** Project directory path (encoded) */
  encodedPath: string;
  /** Original project path */
  originalPath: string;
  /** Full path to project directory in .claude */
  claudePath: string;
  /** Session files in this project */
  sessions: SessionFile[];
}

// ============================================================
// PATH UTILITIES
// ============================================================

/**
 * Get the Claude projects directory path.
 */
export function getClaudeProjectsDir(): string {
  return join(homedir(), ".claude", "projects");
}

/**
 * Decode Claude's path encoding (hyphens back to slashes).
 * e.g., "-home-user-project" -> "/home/user/project"
 */
export function decodeProjectPath(encoded: string): string {
  // Replace leading hyphen with slash, then remaining hyphens
  return encoded.replace(/^-/, "/").replace(/-/g, "/");
}

/**
 * Encode a path for Claude's directory naming.
 * e.g., "/home/user/project" -> "-home-user-project"
 */
export function encodeProjectPath(path: string): string {
  return path.replace(/\//g, "-");
}

/**
 * Check if a filename is a regular session file (GUID pattern).
 */
export function isRegularSessionFile(filename: string): boolean {
  return filename.endsWith(".jsonl") && !filename.startsWith("agent-");
}

/**
 * Check if a filename is an agent session file.
 */
export function isAgentSessionFile(filename: string): boolean {
  return filename.startsWith("agent-") && filename.endsWith(".jsonl");
}

/**
 * Extract agent ID from filename.
 * e.g., "agent-a56fb9a.jsonl" -> "a56fb9a"
 */
export function extractAgentId(filename: string): string | null {
  const match = filename.match(/^agent-([a-f0-9]+)\.jsonl$/);
  return match ? match[1] : null;
}

// ============================================================
// DISCOVERY FUNCTIONS
// ============================================================

/**
 * List all projects in the Claude projects directory.
 */
export async function listProjects(): Promise<ProjectInfo[]> {
  const projectsDir = getClaudeProjectsDir();
  const projects: ProjectInfo[] = [];

  try {
    const entries = await readdir(projectsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const claudePath = join(projectsDir, entry.name);
      const sessions = await listSessionFiles(claudePath);

      projects.push({
        encodedPath: entry.name,
        originalPath: decodeProjectPath(entry.name),
        claudePath,
        sessions,
      });
    }

    return projects;
  } catch (e) {
    // Directory doesn't exist or not accessible
    return [];
  }
}

/**
 * List all session files in a project directory.
 */
export async function listSessionFiles(projectDir: string): Promise<SessionFile[]> {
  const sessions: SessionFile[] = [];

  try {
    const entries = await readdir(projectDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".jsonl")) continue;

      const filePath = join(projectDir, entry.name);
      const stats = await stat(filePath);
      const isAgent = isAgentSessionFile(entry.name);

      sessions.push({
        path: filePath,
        sessionId: basename(entry.name, ".jsonl"),
        mtime: stats.mtime,
        size: stats.size,
        isAgent,
        agentId: isAgent ? extractAgentId(entry.name) ?? undefined : undefined,
      });
    }

    // Sort by modification time (newest first)
    sessions.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    return sessions;
  } catch (e) {
    return [];
  }
}

/**
 * Find agent session files that belong to a specific session.
 */
export async function findAgentSessionsForSession(
  projectDir: string,
  sessionId: string
): Promise<SessionFile[]> {
  const allSessions = await listSessionFiles(projectDir);
  const agentSessions: SessionFile[] = [];

  for (const session of allSessions) {
    if (!session.isAgent) continue;

    // Check if this agent belongs to the target session by reading first line
    try {
      const result = await parseJsonlFile(session.path, {
        filterTypes: ["user", "assistant"],
      });

      if (result.metadata.sessionId === sessionId) {
        agentSessions.push(session);
      }
    } catch {
      // Skip unreadable files
    }
  }

  return agentSessions;
}

// ============================================================
// FULL SESSION PARSING
// ============================================================

export interface FullSessionResult {
  /** Main session parse result */
  main: ParseResult;
  /** Agent session parse results (keyed by agent ID) */
  agents: Map<string, ParseResult>;
  /** All session files */
  files: {
    main: SessionFile;
    agents: SessionFile[];
  };
}

/**
 * Parse a full session including all related agent sessions.
 */
export async function parseFullSession(
  projectDir: string,
  sessionId: string
): Promise<FullSessionResult | null> {
  const mainPath = join(projectDir, `${sessionId}.jsonl`);

  try {
    const mainStats = await stat(mainPath);
    const main = await parseJsonlFile(mainPath);

    const mainFile: SessionFile = {
      path: mainPath,
      sessionId,
      mtime: mainStats.mtime,
      size: mainStats.size,
      isAgent: false,
    };

    // Find and parse agent sessions
    const agentFiles = await findAgentSessionsForSession(projectDir, sessionId);
    const agents = new Map<string, ParseResult>();

    for (const agentFile of agentFiles) {
      if (agentFile.agentId) {
        const agentResult = await parseJsonlFile(agentFile.path);
        agents.set(agentFile.agentId, agentResult);
      }
    }

    return {
      main,
      agents,
      files: {
        main: mainFile,
        agents: agentFiles,
      },
    };
  } catch {
    return null;
  }
}
