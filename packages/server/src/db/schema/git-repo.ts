import {
  boolean,
  integer,
  jsonb,
  pgSchema,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const claudeArchiveSchema = pgSchema("claude_archive");

/**
 * GitRepo - Physical Git checkouts on different hosts.
 * A project can have multiple checkouts.
 */
export const gitRepo = claudeArchiveSchema.table(
  "git_repo",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    // FK to Project
    projectId: uuid("project_id")
      .notNull()
      .references(() => project.id),

    // Hostname of the machine
    host: text("host").notNull(),

    // Absolute path to the Git root
    path: text("path").notNull(),

    // main/master/etc.
    defaultBranch: text("default_branch"),

    // Currently checked out branch
    currentBranch: text("current_branch"),

    // Current HEAD commit SHA
    headSha: text("head_sha"),

    // Uncommitted changes present
    isDirty: boolean("is_dirty").default(false),

    // Number of changed files
    dirtyFilesCount: integer("dirty_files_count"),

    // git status --porcelain + metadata
    dirtySnapshot: jsonb("dirty_snapshot"),

    // Newest mtime of a dirty file
    lastFileChangeAt: timestamp("last_file_change_at", { withTimezone: true }),

    // Last collector scan
    lastScannedAt: timestamp("last_scanned_at", { withTimezone: true }),

    // Creation timestamp
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    // Unique constraint: one repo per host + path combination
    unique("git_repo_host_path_unique").on(table.host, table.path),
  ]
);

export const gitRepoRelations = relations(gitRepo, ({ one, many }) => ({
  project: one(project, {
    fields: [gitRepo.projectId],
    references: [project.id],
  }),
  branches: many(gitBranch),
  workspaces: many(workspace),
}));

// Import after defining gitRepo to avoid circular dependency
import { project } from "./project";
import { gitBranch } from "./git-branch";
import { workspace } from "./workspace";

export type GitRepo = typeof gitRepo.$inferSelect;
export type NewGitRepo = typeof gitRepo.$inferInsert;
