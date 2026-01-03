import {
  pgSchema,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const claudeArchiveSchema = pgSchema("claude_archive");

/**
 * Workspace - Claude Code project directories.
 * Corresponds to `~/.claude/projects/{encoded-path}/`.
 */
export const workspace = claudeArchiveSchema.table(
  "workspace",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    // FK to Project
    projectId: uuid("project_id")
      .notNull()
      .references(() => project.id),

    // Hostname of the machine
    host: text("host").notNull(),

    // Working directory (absolute path)
    cwd: text("cwd").notNull(),

    // Path under `~/.claude/projects/`
    claudeProjectPath: text("claude_project_path").notNull(),

    // FK to GitRepo (if present) - optional
    gitRepoId: uuid("git_repo_id").references(() => gitRepo.id),

    // First sync timestamp
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull(),

    // Last sync timestamp
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    // Unique constraint: one workspace per host + cwd combination
    unique("workspace_host_cwd_unique").on(table.host, table.cwd),
  ]
);

export const workspaceRelations = relations(workspace, ({ one, many }) => ({
  project: one(project, {
    fields: [workspace.projectId],
    references: [project.id],
  }),
  gitRepo: one(gitRepo, {
    fields: [workspace.gitRepoId],
    references: [gitRepo.id],
  }),
  sessions: many(session),
}));

// Import after defining workspace to avoid circular dependency
import { project } from "./project";
import { gitRepo } from "./git-repo";
import { session } from "./session";

export type Workspace = typeof workspace.$inferSelect;
export type NewWorkspace = typeof workspace.$inferInsert;
